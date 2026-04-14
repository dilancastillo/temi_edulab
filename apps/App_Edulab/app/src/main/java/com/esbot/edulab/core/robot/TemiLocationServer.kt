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

        // Parsear comandos manualmente
        val commands = parseCommandsFromJson(body)
        if (commands == null) {
            return 400 to """{"ok":false,"message":"Bad request"}"""
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
     */
    private fun parseCommandsFromJson(body: String): List<RobotCommand>? {
        return try {
            val commands = mutableListOf<RobotCommand>()

            val commandsArrayMatch = Regex(""""commands"\s*:\s*\[(.*)]\s*\}""", RegexOption.DOT_MATCHES_ALL)
                .find(body) ?: return null
            val arrayContent = commandsArrayMatch.groupValues[1].trim()

            if (arrayContent.isEmpty()) return null

            // Split objects by finding each {"type":...} entry
            // Use a state-machine approach to handle large base64 values
            val typeRegex = Regex(""""type"\s*:\s*"([^"]+)"""")
            val locationRegex = Regex(""""location"\s*:\s*"([^"]+)"""")
            val textRegex = Regex(""""text"\s*:\s*"([^"]+)"""")
            // base64 only uses A-Za-z0-9+/= so safe to match greedily
            val imageBase64Regex = Regex(""""imageBase64"\s*:\s*"([A-Za-z0-9+/=\r\n]+)"""")

            // Find all type occurrences and extract surrounding context
            var searchStart = 0
            while (searchStart < arrayContent.length) {
                val typeMatch = typeRegex.find(arrayContent, searchStart) ?: break
                val type = typeMatch.groupValues[1]
                val contextStart = typeMatch.range.first
                // Context window: from object start to next object or end
                val nextTypeMatch = typeRegex.find(arrayContent, typeMatch.range.last + 1)
                val contextEnd = nextTypeMatch?.range?.first ?: arrayContent.length
                val context = arrayContent.substring(contextStart, contextEnd)

                when (type) {
                    "Navigate" -> {
                        val location = locationRegex.find(context)?.groupValues?.getOrNull(1)
                        if (!location.isNullOrEmpty()) commands.add(RobotCommand.Navigate(location))
                    }
                    "Say" -> {
                        val text = textRegex.find(context)?.groupValues?.getOrNull(1)
                        if (!text.isNullOrEmpty()) commands.add(RobotCommand.Say(text))
                    }
                    "ShowImage" -> {
                        // Search in full body for base64 (may be very long)
                        val imgMatch = imageBase64Regex.find(body, typeMatch.range.first)
                        val imageBase64 = imgMatch?.groupValues?.getOrNull(1)?.replace("\r", "")?.replace("\n", "")
                        if (!imageBase64.isNullOrEmpty()) commands.add(RobotCommand.ShowImage(imageBase64))
                    }
                    "ShowVideo" -> {
                        val urlMatch = Regex(""""videoUrl"\s*:\s*"([^"]+)"""").find(context)
                        val videoUrl = urlMatch?.groupValues?.getOrNull(1)
                        if (!videoUrl.isNullOrEmpty()) commands.add(RobotCommand.ShowVideo(videoUrl))
                    }
                    else -> Log.d(TAG, "Tipo desconocido ignorado: $type")
                }
                searchStart = typeMatch.range.last + 1
            }

            if (commands.isEmpty()) null else commands
        } catch (e: Exception) {
            Log.w(TAG, "parseCommandsFromJson falló: ${e.message}", e)
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun fetchLocationsViaReflection(): List<String> {
        return try {
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
