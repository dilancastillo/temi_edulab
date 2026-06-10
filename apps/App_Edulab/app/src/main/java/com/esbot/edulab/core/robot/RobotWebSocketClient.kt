package com.esbot.edulab.core.robot

import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "RobotWebSocketClient"
private const val SERVER_URL = "ws://87.99.152.162:3000/api/robot/ws"
private const val SERVER_BASE_URL = "http://87.99.152.162:3000"
private const val RECONNECT_DELAY_MS = 5000L

/** Converts a relative path like /uploads/images/foo.png to an absolute URL. */
internal fun resolveUrl(url: String): String =
    if (url.startsWith("http://") || url.startsWith("https://")) url
    else "$SERVER_BASE_URL$url"

@Singleton
class RobotWebSocketClient @Inject constructor(
    private val commandRunner: RobotCommandRunner
) {
    private val client = OkHttpClient.Builder()
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private var resolvedRobotId: String? = null

    private val _executing = kotlinx.coroutines.flow.MutableStateFlow(false)
    val executing: kotlinx.coroutines.flow.StateFlow<Boolean> = _executing
    @Volatile private var cancelRequested: Boolean = false
    @Volatile private var testUrl: String? = null

    fun start() {
        Log.d(TAG, "start() — esperando onRobotReady para conectar WebSocket")
    }

    fun stop() {
        webSocket?.close(1000, "App stopped")
        webSocket = null
    }

    /**
     * Reconnects with a specific robotId — used when the SDK becomes ready
     * and we need to re-register with the correct serial number.
     */
    fun reconnectWithId(id: String) {
        resolvedRobotId = id
        webSocket?.close(1000, "Re-registering with correct robotId")
        webSocket = null
        val request = Request.Builder()
            .url(testUrl ?: SERVER_URL)
            .build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket reconectado. Registrando robotId='$id'")
                ws.send(buildRegisterMsg(id))
            }
            override fun onMessage(ws: WebSocket, text: String) {
                Log.d(TAG, "Mensaje recibido: $text")
                handleMessage(text)
            }
            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket cerrado: code=$code reason=$reason")
                // No reconectar si fue cerrado intencionalmente para re-registrar
                if (reason == "Re-registering with correct robotId") return
                scheduleReconnect()
            }
            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket fallo: ${t.message}", t)
                scheduleReconnect()
            }
        })
    }

    /**
     * Connects to a custom URL. Used in tests to inject a MockWebServer URL.
     * @param url The WebSocket URL to connect to.
     * @param overrideRobotId Optional robotId override (for testing specific robotId values).
     */
    @JvmOverloads
    fun connectToUrl(url: String, overrideRobotId: String? = null) {
        testUrl = url
        val effectiveRobotId = overrideRobotId ?: resolvedRobotId ?: resolveRobotId()
        val request = Request.Builder()
            .url(url)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket conectado (test). Registrando robotId='$effectiveRobotId'")
                ws.send(buildRegisterMsg(effectiveRobotId))
            }

            override fun onMessage(ws: WebSocket, text: String) {
                Log.d(TAG, "Mensaje recibido: $text")
                handleMessage(text)
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket cerrado: code=$code reason=$reason")
                scheduleReconnect()
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket fallo: ${t.message}", t)
                scheduleReconnect()
            }
        })
    }

    fun connect() {
        val effectiveId = resolvedRobotId ?: resolveRobotId()
        val request = Request.Builder()
            .url(SERVER_URL)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket conectado. Registrando robotId='$effectiveId'")
                ws.send(buildRegisterMsg(effectiveId))
            }

            override fun onMessage(ws: WebSocket, text: String) {
                Log.d(TAG, "Mensaje recibido: $text")
                handleMessage(text)
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket cerrado: code=$code reason=$reason")
                scheduleReconnect()
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket fallo: ${t.message}", t)
                scheduleReconnect()
            }
        })
    }

    private fun buildRegisterMsg(id: String): String {
        val obj = JsonObject()
        obj.addProperty("type", "register")
        obj.addProperty("robotId", id)
        return obj.toString()
    }

    private fun handleMessage(text: String) {
        try {
            val json = JsonParser.parseString(text).asJsonObject
            when (val type = json.get("type")?.asString ?: "") {
                "execute" -> {
                    val requestId = json.get("requestId").asString
                    val commandsArray = json.getAsJsonArray("commands")
                    val commands = parseCommands(commandsArray)
                    handleExecute(requestId, commands)
                }
                "locations" -> {
                    val requestId = json.get("requestId").asString
                    handleLocations(requestId)
                }
                "cancel" -> {
                    val requestId = json.get("requestId").asString
                    handleCancel(requestId)
                }
                else -> Log.w(TAG, "Tipo de mensaje desconocido: $type")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al parsear mensaje: ${e.message}", e)
        }
    }

    private fun handleExecute(requestId: String, commands: List<RobotCommand>) {
        if (_executing.value) {
            Log.d(TAG, "Robot ocupado, rechazando requestId=$requestId")
            sendResponse(requestId, ok = false, message = "Robot ocupado")
            return
        }

        cancelRequested = false
        commandRunner.resetCancel() // reset any previous cancel state if runner supports it

        Thread {
            _executing.value = true
            try {
                val result = commandRunner.runSequence(commands)
                if (result.isSuccess) {
                    sendResponse(requestId, ok = true, message = "Ejecutado")
                } else {
                    val errorMsg = result.exceptionOrNull()?.message ?: "Error desconocido"
                    sendResponse(requestId, ok = false, message = errorMsg)
                }
            } finally {
                _executing.value = false
            }
        }.start()
    }

    private fun handleCancel(requestId: String) {
        Log.d(TAG, "Cancel request received: requestId=$requestId executing=${_executing.value}")
        if (!_executing.value) {
            sendResponse(requestId, ok = false, message = "No hay ejecución activa")
            return
        }

        cancelRequested = true
        commandRunner.requestCancel()
        sendResponse(requestId, ok = true, message = "Cancelado")
    }

    private fun handleLocations(requestId: String) {
        val locations = getLocationsViaReflection()
        val locationsArray = JsonArray().apply {
            locations.forEach { add(it) }
        }
        val msg = JsonObject()
        msg.addProperty("type", "locations_response")
        msg.addProperty("requestId", requestId)
        msg.add("locations", locationsArray)
        webSocket?.send(msg.toString())
        Log.d(TAG, "LocationsResponse enviado: requestId=$requestId locations=$locations")
    }

    private fun sendResponse(requestId: String, ok: Boolean, message: String) {
        val msg = JsonObject()
        msg.addProperty("type", "response")
        msg.addProperty("requestId", requestId)
        msg.addProperty("ok", ok)
        msg.addProperty("message", message)
        webSocket?.send(msg.toString())
        Log.d(TAG, "Response enviado: requestId=$requestId ok=$ok message=$message")
    }

    private fun scheduleReconnect() {
        Log.d(TAG, "Reconexión programada en ${RECONNECT_DELAY_MS}ms")
        try {
            Handler(Looper.getMainLooper()).postDelayed({
                val url = testUrl
                val id = resolvedRobotId
                when {
                    url != null -> connectToUrl(url)
                    id != null -> reconnectWithId(id)
                    else -> connect()
                }
            }, RECONNECT_DELAY_MS)
        } catch (e: Exception) {
            val scheduler = Executors.newSingleThreadScheduledExecutor()
            scheduler.schedule({
                val url = testUrl
                val id = resolvedRobotId
                when {
                    url != null -> connectToUrl(url)
                    id != null -> reconnectWithId(id)
                    else -> connect()
                }
                scheduler.shutdown()
            }, RECONNECT_DELAY_MS, TimeUnit.MILLISECONDS)
        }
    }

    fun resolveRobotId(): String {
        return try {
            val rClass = Class.forName("com.robotemi.sdk.Robot")
            val robot = rClass.getMethod("getInstance").invoke(null)
            val serial = rClass.getMethod("getSerialNumber").invoke(robot) as? String
            if (!serial.isNullOrBlank()) {
                Log.d(TAG, "robotId resuelto via SDK: $serial")
                serial
            } else {
                val buildSerial = try { Build.SERIAL } catch (e: Exception) { null }
                buildSerial?.takeIf { it.isNotBlank() }?.also {
                    Log.d(TAG, "robotId resuelto via Build.SERIAL: $it")
                } ?: "temi-1".also {
                    Log.d(TAG, "robotId fallback: temi-1")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "resolveRobotId: SDK no disponible (${e.message}), usando Build.SERIAL")
            val buildSerial = try { Build.SERIAL } catch (ex: Exception) { null }
            buildSerial?.takeIf { it.isNotBlank() }?.also {
                Log.d(TAG, "robotId resuelto via Build.SERIAL: $it")
            } ?: "temi-1".also {
                Log.d(TAG, "robotId fallback: temi-1")
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun getLocationsViaReflection(): List<String> {
        return try {
            val rClass = Class.forName("com.robotemi.sdk.Robot")
            val robot = rClass.getMethod("getInstance").invoke(null)
                ?: return emptyList()
            val locations = rClass.getMethod("getLocations").invoke(robot) as? List<String>
            locations ?: emptyList()
        } catch (e: Exception) {
            Log.e(TAG, "getLocations via reflection falló: ${e.message}", e)
            emptyList()
        }
    }

    private fun parseCommands(array: JsonArray): List<RobotCommand> {
        val commands = mutableListOf<RobotCommand>()
        for (element in array) {
            val obj = element.asJsonObject
            val command = parseCommand(obj) ?: continue
            commands.add(command)
        }
        return commands
    }

    private fun parseCommand(obj: JsonObject): RobotCommand? {
        return try {
            when (val type = obj.get("type")?.asString ?: "") {
                "navigate", "Navigate" -> RobotCommand.Navigate(obj.get("location").asString)
                "say", "Say" -> RobotCommand.Say(
                    text = obj.get("text").asString,
                    gender = obj.get("gender")?.takeIf { !it.isJsonNull }?.asString,
                    speed = obj.get("speed")?.takeIf { !it.isJsonNull }?.asFloat,
                    pitch = obj.get("pitch")?.takeIf { !it.isJsonNull }?.asInt,
                    language = obj.get("language")?.takeIf { !it.isJsonNull }?.asString,
                    showAnimation = obj.get("showAnimation")?.takeIf { !it.isJsonNull }?.asBoolean ?: false
                )
                "showImage", "ShowImage" -> RobotCommand.ShowImage(
                    imageUrl = resolveUrl(obj.get("imageUrl").asString),
                    durationMs = obj.get("durationMs")?.asLong ?: 7000L
                )
                "showVideo", "ShowVideo" -> RobotCommand.ShowVideo(resolveUrl(obj.get("videoUrl").asString))
                "askCondition", "AskCondition" -> {
                    val optionsArray = obj.getAsJsonArray("options")
                    val options = optionsArray.map { optEl ->
                        val opt = optEl.asJsonObject
                        ConditionOption(
                            keyword = opt.get("keyword").asString,
                            action = parseCommand(opt.getAsJsonObject("action"))
                                ?: RobotCommand.Say("Opción no reconocida")
                        )
                    }
                    RobotCommand.AskCondition(
                        question = obj.get("question").asString,
                        options = options
                    )
                }
                "askCapture", "AskCapture" -> RobotCommand.AskCapture(
                    question = obj.get("question").asString
                )
                "repeat", "Repeat" -> RobotCommand.Repeat(
                    times = obj.get("times").asInt,
                    commands = parseCommands(obj.getAsJsonArray("commands"))
                )
                "whileCount", "WhileCount" -> RobotCommand.WhileCount(
                    limit = obj.get("limit").asInt,
                    commands = parseCommands(obj.getAsJsonArray("commands"))
                )
                "whileTimer", "WhileTimer" -> RobotCommand.WhileTimer(
                    seconds = obj.get("seconds").asInt,
                    commands = parseCommands(obj.getAsJsonArray("commands"))
                )
                "whileListen", "WhileListen" -> RobotCommand.WhileListen(
                    stopWord = obj.get("stopWord").asString,
                    maxIterations = obj.get("maxIterations").asInt,
                    commands = parseCommands(obj.getAsJsonArray("commands"))
                )
                "whileMqtt", "WhileMqtt" -> RobotCommand.WhileMqtt(
                    topic = obj.get("topic").asString,
                    commands = parseCommands(obj.getAsJsonArray("commands"))
                )
                "wait", "Wait" -> RobotCommand.Wait(
                    seconds = obj.get("seconds").asInt
                )
                else -> {
                    Log.w(TAG, "Tipo de comando desconocido: $type")
                    null
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al parsear comando: ${e.message}", e)
            null
        }
    }
}
