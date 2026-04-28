package com.esbot.edulab.core.robot

import android.util.Log
import java.io.PrintWriter
import java.net.ServerSocket
import java.net.Socket
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "TemiLocationServer"
private const val PORT = 8765
private const val PATH_LOCATIONS = "/locations"
private const val PATH_EXECUTE = "/execute"

@Singleton
class TemiLocationServer @Inject constructor(
    private val commandRunner: RobotCommandRunner
) : LocationServer {

    // Secondary constructor for testing with a custom port
    internal constructor(commandRunner: RobotCommandRunner, port: Int) : this(commandRunner) {
        this.port = port
    }

    private var port: Int = PORT

    private var serverSocket: ServerSocket? = null
    private var serverThread: Thread? = null

    @Volatile
    private var running = false

    @Volatile
    private var executing = false

    /** Returns the actual bound port after [start] is called. Useful for tests using port 0. */
    val localPort: Int get() = serverSocket?.localPort ?: port

    override fun start() {
        if (running) return
        try {
            val socket = ServerSocket(port)
            serverSocket = socket
            running = true
            serverThread = Thread {
                Log.d(TAG, "LocationServer iniciado en puerto $PORT")
                while (running) {
                    try {
                        val client = socket.accept()
                        Thread { handleClient(client) }.start()
                    } catch (e: Exception) {
                        if (running) Log.w(TAG, "Error aceptando conexión: ${e.message}")
                    }
                }
            }.also { it.isDaemon = true; it.start() }
        } catch (e: Exception) {
            Log.e(TAG, "start() falló: ${e.message}", e)
        }
    }

    override fun stop() {
        running = false
        try {
            serverSocket?.close()
        } catch (e: Exception) {
            Log.w(TAG, "stop() falló: ${e.message}", e)
        } finally {
            serverSocket = null
            serverThread = null
            Log.d(TAG, "LocationServer detenido")
        }
    }

    private fun handleClient(client: Socket) {
        try {
            client.use {
                val reader = client.getInputStream().bufferedReader()
                val requestLine = reader.readLine() ?: return
                val parts = requestLine.split(" ")
                val method = parts.getOrNull(0) ?: "GET"
                val path = parts.getOrNull(1) ?: "/"

                val (statusCode, body) = when {
                    method == "OPTIONS" -> {
                        // CORS preflight — respond 204 with all necessary headers
                        204 to ""
                    }
                    method == "GET" && path == PATH_LOCATIONS -> {
                        val locations = fetchLocationsViaReflection()
                        200 to locations.toLocationsJson()
                    }
                    method == "POST" && path == PATH_EXECUTE -> {
                        if (executing) {
                            // Must drain headers before responding to avoid broken pipe
                            drainHeaders(reader)
                            503 to """{"ok":false,"message":"Robot ocupado, espera a que termine la ejecución actual"}"""
                        } else {
                            handleExecuteRequest(reader)
                        }
                    }
                    else -> 404 to ""
                }

                val bytes = body.toByteArray(Charsets.UTF_8)
                val writer = PrintWriter(client.getOutputStream(), true)
                writer.print("HTTP/1.1 $statusCode OK\r\n")
                writer.print("Content-Type: application/json\r\n")
                writer.print("Access-Control-Allow-Origin: *\r\n")
                writer.print("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n")
                writer.print("Access-Control-Allow-Headers: Content-Type\r\n")
                writer.print("Content-Length: ${bytes.size}\r\n")
                writer.print("Connection: close\r\n")
                writer.print("\r\n")
                writer.flush()
                client.getOutputStream().write(bytes)
                client.getOutputStream().flush()
            }
        } catch (e: Exception) {
            Log.w(TAG, "handleClient falló: ${e.message}", e)
        }
    }

    private fun drainHeaders(reader: java.io.BufferedReader) {
        try {
            var line = reader.readLine()
            while (line != null && line.isNotEmpty()) {
                line = reader.readLine()
            }
        } catch (e: Exception) {
            Log.w(TAG, "drainHeaders falló: ${e.message}")
        }
    }

    private fun handleExecuteRequest(reader: java.io.BufferedReader): Pair<Int, String> {
        // Leer headers para obtener Content-Length
        var contentLength = 0
        var line = reader.readLine()
        while (line != null && line.isNotEmpty()) {
            if (line.startsWith("Content-Length:", ignoreCase = true)) {
                contentLength = line.substringAfter(":").trim().toIntOrNull() ?: 0
            }
            line = reader.readLine()
        }

        if (contentLength <= 0) {
            return 400 to """{"ok":false,"message":"Bad request"}"""
        }

        // Leer body como chars (el BufferedReader ya decodificó UTF-8 al construirse)
        // Usamos readText con límite para evitar bloqueos con caracteres multibyte
        val sb = StringBuilder(contentLength)
        val buf = CharArray(8192)
        var remaining = contentLength
        while (remaining > 0) {
            val toRead = minOf(buf.size, remaining)
            val read = reader.read(buf, 0, toRead)
            if (read == -1) break
            sb.append(buf, 0, read)
            // Decrease by actual chars read (not bytes) — stop when we have enough content
            remaining -= read
            // Safety: if we have a complete JSON object, stop early
            if (sb.contains("}") && sb.trimEnd().endsWith("}")) break
        }
        val body = sb.toString()
        if (body.isEmpty()) {
            return 400 to """{"ok":false,"message":"Bad request"}"""
        }

        Log.d(TAG, "handleExecuteRequest recibió body: $body")

        // Parsear comandos manualmente
        val commands = parseCommandsFromJson(body)
        if (commands == null) {
            Log.e(TAG, "parseCommandsFromJson devolvió null")
            return 400 to """{"ok":false,"message":"Bad request"}"""
        }

        Log.d(TAG, "Comandos parseados: ${commands.size} comandos")
        commands.forEachIndexed { idx, cmd ->
            Log.d(TAG, "  Comando $idx: ${cmd.javaClass.simpleName}")
        }

        // Ejecutar comandos secuencialmente
        executing = true
        val result = try {
            commandRunner.runSequence(commands)
        } finally {
            executing = false
        }
        if (result.isFailure) {
            val msg = result.exceptionOrNull()?.message ?: "Error desconocido"
            Log.e(TAG, "runSequence falló: $msg")
            return 500 to """{"ok":false,"message":"${msg.replace("\"", "\\\"")}"}"""
        }

        return 200 to """{"ok":true,"message":"Ejecutado"}"""
    }

    /**
     * Parsea manualmente el JSON del body con la forma:
     * {"commands":[{"type":"Navigate","location":"Sala Principal"}]}
     *
     * Devuelve null si el body es inválido o no contiene comandos Navigate.
     * Comandos de tipo desconocido se ignoran (forward-compatibility).
     * 
     * IMPORTANTE: Los comandos dentro de "options" de AskCondition NO se incluyen
     * en la lista de comandos principales, solo se ejecutan si el usuario selecciona esa opción.
     */
    private fun parseCommandsFromJson(body: String): List<RobotCommand>? {
        return try {
            val commands = mutableListOf<RobotCommand>()

            // Find the "commands" array
            val commandsArrayMatch = Regex(""""commands"\s*:\s*\[(.*)]\s*\}""", RegexOption.DOT_MATCHES_ALL)
                .find(body) ?: return null
            val arrayContent = commandsArrayMatch.groupValues[1].trim()

            if (arrayContent.isEmpty()) return null

            // Split by finding each top-level command object in the commands array
            // We need to parse only top-level commands, not nested ones inside "options"
            val typeRegex = Regex(""""type"\s*:\s*"([^"]+)"""")
            
            // Find all type occurrences
            var searchStart = 0
            while (searchStart < arrayContent.length) {
                val typeMatch = typeRegex.find(arrayContent, searchStart) ?: break
                val type = typeMatch.groupValues[1]
                
                // Find the context for this command (from current { to next { or end)
                val contextStart = arrayContent.lastIndexOf('{', typeMatch.range.first)
                if (contextStart < 0) {
                    searchStart = typeMatch.range.last + 1
                    continue
                }

                // Find the closing } for this command object
                var braceDepth = 0
                var contextEnd = -1
                for (i in contextStart until arrayContent.length) {
                    when (arrayContent[i]) {
                        '{' -> braceDepth++
                        '}' -> {
                            braceDepth--
                            if (braceDepth == 0) {
                                contextEnd = i
                                break
                            }
                        }
                    }
                }

                if (contextEnd < 0) {
                    searchStart = typeMatch.range.last + 1
                    continue
                }

                val context = arrayContent.substring(contextStart, contextEnd + 1)

                Log.d(TAG, "Parsing type='$type' context: ${context.take(100)}...")

                // Skip commands that are nested inside other commands (e.g., inside "options" or "action")
                // Check if this command is at the top level of the commands array
                val isTopLevel = isTopLevelCommand(arrayContent, contextStart)
                if (!isTopLevel) {
                    Log.d(TAG, "  ⊘ Comando anidado (dentro de options/action), ignorado")
                    searchStart = typeMatch.range.last + 1
                    continue
                }

                when (type) {
                    "Navigate" -> {
                        val locationMatch = Regex(""""location"\s*:\s*"([^"]+)"""").find(context)
                        val location = locationMatch?.groupValues?.getOrNull(1)
                        if (!location.isNullOrEmpty()) {
                            commands.add(RobotCommand.Navigate(location))
                            Log.d(TAG, "  ✓ Navigate: $location")
                        }
                    }
                    "Say" -> {
                        val textMatch = Regex(""""text"\s*:\s*"([^"]+)"""").find(context)
                        val text = textMatch?.groupValues?.getOrNull(1)
                        if (!text.isNullOrEmpty()) {
                            commands.add(RobotCommand.Say(text))
                            Log.d(TAG, "  ✓ Say: $text")
                        }
                    }
                    "ShowImage" -> {
                        val urlMatch = Regex(""""imageUrl"\s*:\s*"([^"]+)"""").find(context)
                        val imageUrl = urlMatch?.groupValues?.getOrNull(1)
                        if (!imageUrl.isNullOrEmpty()) {
                            commands.add(RobotCommand.ShowImage(imageUrl))
                            Log.d(TAG, "  ✓ ShowImage: $imageUrl")
                        }
                    }
                    "ShowVideo" -> {
                        val urlMatch = Regex(""""videoUrl"\s*:\s*"([^"]+)"""").find(context)
                        val videoUrl = urlMatch?.groupValues?.getOrNull(1)
                        if (!videoUrl.isNullOrEmpty()) {
                            commands.add(RobotCommand.ShowVideo(videoUrl))
                            Log.d(TAG, "  ✓ ShowVideo: $videoUrl")
                        }
                    }
                    "AskCondition" -> {
                        val questionMatch = Regex(""""question"\s*:\s*"([^"]+)"""").find(context)
                        val question = questionMatch?.groupValues?.getOrNull(1)
                        if (!question.isNullOrEmpty()) {
                            val condOptions = parseConditionOptions(context)
                            if (condOptions.size >= 2) {
                                commands.add(RobotCommand.AskCondition(question, condOptions))
                                Log.d(TAG, "  ✓ AskCondition: '$question' con ${condOptions.size} opciones")
                            } else {
                                Log.w(TAG, "  ✗ AskCondition: insuficientes opciones (${condOptions.size})")
                            }
                        }
                    }
                    "Repeat" -> {
                        val timesMatch = Regex(""""times"\s*:\s*(\d+)""").find(context)
                        val times = timesMatch?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
                        val innerCommands = parseInnerCommandsFromContext(context)
                        if (innerCommands != null) {
                            commands.add(RobotCommand.Repeat(times, innerCommands))
                            Log.d(TAG, "  ✓ Repeat: times=$times innerCommands=${innerCommands.size}")
                        } else {
                            Log.w(TAG, "  ✗ Repeat: no se pudieron parsear comandos internos")
                        }
                    }
                    "WhileCount" -> {
                        val limitMatch = Regex(""""limit"\s*:\s*(\d+)""").find(context)
                        val limit = limitMatch?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
                        val innerCommands = parseInnerCommandsFromContext(context)
                        if (innerCommands != null) {
                            commands.add(RobotCommand.WhileCount(limit, innerCommands))
                            Log.d(TAG, "  ✓ WhileCount: limit=$limit innerCommands=${innerCommands.size}")
                        } else {
                            Log.w(TAG, "  ✗ WhileCount: no se pudieron parsear comandos internos")
                        }
                    }
                    "WhileTimer" -> {
                        val secondsMatch = Regex(""""seconds"\s*:\s*(\d+)""").find(context)
                        val seconds = secondsMatch?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
                        val innerCommands = parseInnerCommandsFromContext(context)
                        if (innerCommands != null) {
                            commands.add(RobotCommand.WhileTimer(seconds, innerCommands))
                            Log.d(TAG, "  ✓ WhileTimer: seconds=$seconds innerCommands=${innerCommands.size}")
                        } else {
                            Log.w(TAG, "  ✗ WhileTimer: no se pudieron parsear comandos internos")
                        }
                    }
                    "WhileListen" -> {
                        val stopWordMatch = Regex(""""stopWord"\s*:\s*"([^"]+)"""").find(context)
                        val stopWord = stopWordMatch?.groupValues?.getOrNull(1) ?: "listo"
                        val maxIterMatch = Regex(""""maxIterations"\s*:\s*(\d+)""").find(context)
                        val maxIterations = maxIterMatch?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 5
                        val innerCommands = parseInnerCommandsFromContext(context)
                        if (innerCommands != null) {
                            commands.add(RobotCommand.WhileListen(stopWord, maxIterations, innerCommands))
                            Log.d(TAG, "  ✓ WhileListen: stopWord='$stopWord' maxIterations=$maxIterations innerCommands=${innerCommands.size}")
                        } else {
                            Log.w(TAG, "  ✗ WhileListen: no se pudieron parsear comandos internos")
                        }
                    }
                    else -> Log.d(TAG, "  ⊘ Tipo desconocido ignorado: $type")
                }
                searchStart = typeMatch.range.last + 1
            }

            if (commands.isEmpty()) null else commands
        } catch (e: Exception) {
            Log.w(TAG, "parseCommandsFromJson falló: ${e.message}", e)
            null
        }
    }

    /**
     * Verifica si un comando está al nivel superior del array "commands"
     * Un comando es top-level si no está dentro de ningún otro objeto (como "options" o "action")
     */
    private fun isTopLevelCommand(arrayContent: String, commandStart: Int): Boolean {
        // Go backwards from commandStart and count brackets
        // We need to find if we're inside a nested array (like "options": [...])
        // 
        // Strategy: count opening and closing brackets going backwards
        // If we find a ] before finding the [ that matches our position,
        // then we're inside a nested array
        
        var bracketDepth = 0  // Track [ and ]
        var braceDepth = 0    // Track { and }
        
        for (i in commandStart - 1 downTo 0) {
            when (arrayContent[i]) {
                ']' -> bracketDepth++  // Found closing bracket
                '[' -> {
                    bracketDepth--
                    if (bracketDepth < 0) {
                        // We found the opening bracket of an array
                        // Check if it's preceded by "options" or "action"
                        val beforeBracket = arrayContent.substring(maxOf(0, i - 30), i).lowercase()
                        if (beforeBracket.contains("\"options\"") || beforeBracket.contains("\"action\"")) {
                            // This is a nested array, not top-level
                            return false
                        }
                        // If it's "commands", we're at top level
                        if (beforeBracket.contains("\"commands\"")) {
                            return true
                        }
                    }
                }
                '}' -> braceDepth++
                '{' -> braceDepth--
            }
        }
        
        // If we didn't find any array bracket, assume it's top-level
        return true
    }

    /**
     * Parses the inner "commands" array from a Repeat command context.
     * Reuses the brace-counting logic to find and parse the nested commands array.
     * 
     * @param context The JSON string containing the Repeat command object
     * @return List of parsed RobotCommand objects, or null if parsing fails
     */
    private fun parseInnerCommandsFromContext(context: String): List<RobotCommand>? {
        return try {
            // Find the "commands" key within this context
            val commandsKeyStart = context.indexOf("\"commands\"")
            if (commandsKeyStart < 0) {
                Log.w(TAG, "parseInnerCommandsFromContext: no 'commands' key found")
                return null
            }

            // Find the opening bracket after "commands":
            val bracketStart = context.indexOf('[', commandsKeyStart)
            if (bracketStart < 0) {
                Log.w(TAG, "parseInnerCommandsFromContext: no opening bracket found")
                return null
            }

            // Find matching closing bracket by counting braces and brackets
            var braceCount = 0
            var bracketCount = 1
            var pos = bracketStart + 1
            var bracketEnd = -1

            while (pos < context.length && bracketCount > 0) {
                when (context[pos]) {
                    '{' -> braceCount++
                    '}' -> braceCount--
                    '[' -> bracketCount++
                    ']' -> {
                        if (braceCount == 0) {
                            bracketCount--
                            if (bracketCount == 0) {
                                bracketEnd = pos
                                break
                            }
                        }
                    }
                }
                pos++
            }

            if (bracketEnd < 0) {
                Log.w(TAG, "parseInnerCommandsFromContext: no closing bracket found")
                return null
            }

            val arrayContent = context.substring(bracketStart + 1, bracketEnd)
            Log.d(TAG, "parseInnerCommandsFromContext: arrayContent=${arrayContent.take(200)}...")

            if (arrayContent.trim().isEmpty()) {
                // Empty commands array is valid (no-op)
                return emptyList()
            }

            // Now parse the commands from this array content
            // We can reuse the same parsing logic as the main parseCommandsFromJson
            // by wrapping it in a synthetic JSON structure
            val syntheticJson = """{"commands":[$arrayContent]}"""
            return parseCommandsFromJson(syntheticJson)
        } catch (e: Exception) {
            Log.w(TAG, "parseInnerCommandsFromContext falló: ${e.message}", e)
            null
        }
    }





    private fun parseConditionOptions(context: String): List<ConditionOption> {
        val options = mutableListOf<ConditionOption>()
        
        Log.d(TAG, "parseConditionOptions input context: ${context.take(300)}...")

        // Find the "options" array - look for "options":[{...},{...}]
        val optionsKeyStart = context.indexOf("\"options\"")
        if (optionsKeyStart < 0) {
            Log.w(TAG, "  No se encontró 'options' key")
            return options
        }

        // Find the opening bracket after "options":
        val bracketStart = context.indexOf('[', optionsKeyStart)
        if (bracketStart < 0) return options

        // Find matching closing bracket by counting braces
        var braceCount = 0
        var bracketCount = 1
        var pos = bracketStart + 1
        var bracketEnd = -1

        while (pos < context.length && bracketCount > 0) {
            when (context[pos]) {
                '{' -> braceCount++
                '}' -> braceCount--
                '[' -> bracketCount++
                ']' -> {
                    if (braceCount == 0) {
                        bracketEnd = pos
                        break
                    }
                }
            }
            pos++
        }

        if (bracketEnd < 0) {
            Log.w(TAG, "  No se encontró closing bracket para options array")
            return options
        }

        val arrayContent = context.substring(bracketStart + 1, bracketEnd)
        Log.d(TAG, "  Options array content: ${arrayContent.take(200)}...")

        // Now find each option object
        val keywordRegex = Regex(""""keyword"\s*:\s*"([^"]+)"""")
        var searchPos = 0

        while (searchPos < arrayContent.length) {
            val kwMatch = keywordRegex.find(arrayContent, searchPos) ?: break
            val keyword = kwMatch.groupValues[1]

            // Find the option object containing this keyword
            // Go backwards to find the opening {
            val optionObjStart = arrayContent.lastIndexOf('{', kwMatch.range.first)
            if (optionObjStart < 0) {
                searchPos = kwMatch.range.last + 1
                continue
            }

            // Find the closing } for this object
            var braceDepth = 0
            var optionObjEnd = -1
            for (i in optionObjStart until arrayContent.length) {
                when (arrayContent[i]) {
                    '{' -> braceDepth++
                    '}' -> {
                        braceDepth--
                        if (braceDepth == 0) {
                            optionObjEnd = i
                            break
                        }
                    }
                }
            }

            if (optionObjEnd < 0) {
                searchPos = kwMatch.range.last + 1
                continue
            }

            val optionContext = arrayContent.substring(optionObjStart, optionObjEnd + 1)
            Log.d(TAG, "  Option object: ${optionContext.take(150)}...")

            // Find the action within this option
            val actionMatch = Regex(""""action"\s*:\s*\{(.+?)\}""", RegexOption.DOT_MATCHES_ALL).find(optionContext)
            if (actionMatch == null) {
                Log.w(TAG, "    No se encontró 'action' en option")
                searchPos = kwMatch.range.last + 1
                continue
            }

            val actionContent = actionMatch.groupValues[1]
            val actionTypeMatch = Regex(""""type"\s*:\s*"([^"]+)"""").find(actionContent)
            val actionType = actionTypeMatch?.groupValues?.getOrNull(1)

            Log.d(TAG, "    Action type: $actionType")

            val action: RobotCommand? = when (actionType) {
                "Navigate" -> {
                    val locMatch = Regex(""""location"\s*:\s*"([^"]+)"""").find(actionContent)
                    locMatch?.groupValues?.getOrNull(1)?.let { RobotCommand.Navigate(it) }
                }
                "Say" -> {
                    val textMatch = Regex(""""text"\s*:\s*"([^"]+)"""").find(actionContent)
                    textMatch?.groupValues?.getOrNull(1)?.let { RobotCommand.Say(it) }
                }
                "ShowImage" -> {
                    // Extract imageBase64 - it can be very long, so we need to find the closing quote carefully
                    val base64Start = actionContent.indexOf("\"imageBase64\"")
                    if (base64Start >= 0) {
                        val colonPos = actionContent.indexOf(":", base64Start)
                        val firstQuote = actionContent.indexOf("\"", colonPos)
                        if (firstQuote >= 0) {
                            // Find the closing quote - need to handle escaped quotes
                            var lastQuote = firstQuote + 1
                            while (lastQuote < actionContent.length) {
                                if (actionContent[lastQuote] == '"' && (lastQuote == 0 || actionContent[lastQuote - 1] != '\\')) {
                                    break
                                }
                                lastQuote++
                            }
                            if (lastQuote < actionContent.length) {
                                var base64 = actionContent.substring(firstQuote + 1, lastQuote)
                                    .replace("\r", "").replace("\n", "")
                                
                                // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
                                if (base64.startsWith("data:")) {
                                    val commaIndex = base64.indexOf(",")
                                    if (commaIndex >= 0) {
                                        base64 = base64.substring(commaIndex + 1)
                                    }
                                }
                                
                                if (base64.isNotEmpty()) {
                                    RobotCommand.ShowImage(base64)
                                } else null
                            } else null
                        } else null
                    } else null
                }
                else -> null
            }

            if (action != null) {
                options.add(ConditionOption(keyword, action))
                Log.d(TAG, "    ✓ Option: keyword='$keyword' action=$actionType")
            } else {
                Log.w(TAG, "    ✗ Option: keyword='$keyword' action=$actionType (no se pudo parsear)")
            }

            searchPos = kwMatch.range.last + 1
        }

        Log.d(TAG, "  Total opciones parseadas: ${options.size}")
        return options
    }

    @Suppress("UNCHECKED_CAST")
    private fun fetchLocationsViaReflection(): List<String> {        return try {
            val rClass = Class.forName("com.robotemi.sdk.Robot")
            val r = rClass.getMethod("getInstance").invoke(null) ?: run {
                Log.w(TAG, "Robot.getInstance() = null")
                return emptyList()
            }
            val result = rClass.getMethod("getLocations").invoke(r)
            (result as? List<String>) ?: emptyList()
        } catch (e: Exception) {
            Log.w(TAG, "fetchLocationsViaReflection falló: ${e.message}", e)
            emptyList()
        }
    }
}

fun List<String>.toLocationsJson(): String {
    val items = joinToString(separator = ", ") { "\"${it.replace("\"", "\\\"")}\"" }
    return """{"locations": [$items]}"""
}
