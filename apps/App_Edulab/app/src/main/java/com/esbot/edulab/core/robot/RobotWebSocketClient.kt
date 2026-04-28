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
private const val SERVER_URL = "ws://87.99.152.162/api/robot/ws"
private const val RECONNECT_DELAY_MS = 5000L

@Singleton
class RobotWebSocketClient @Inject constructor(
    private val commandRunner: RobotCommandRunner
) {
    private val client = OkHttpClient.Builder()
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private val robotId: String by lazy { resolveRobotId() }

    @Volatile private var executing: Boolean = false
    @Volatile private var testUrl: String? = null

    fun start() {
        connect()
    }

    fun stop() {
        webSocket?.close(1000, "App stopped")
        webSocket = null
    }

    /**
     * Connects to a custom URL. Used in tests to inject a MockWebServer URL.
     * @param url The WebSocket URL to connect to.
     * @param overrideRobotId Optional robotId override (for testing specific robotId values).
     */
    @JvmOverloads
    fun connectToUrl(url: String, overrideRobotId: String? = null) {
        testUrl = url
        val effectiveRobotId = overrideRobotId ?: robotId
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
        val request = Request.Builder()
            .url(SERVER_URL)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket conectado. Registrando robotId='$robotId'")
                ws.send(buildRegisterMsg(robotId))
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
                else -> Log.w(TAG, "Tipo de mensaje desconocido: $type")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al parsear mensaje: ${e.message}", e)
        }
    }

    private fun handleExecute(requestId: String, commands: List<RobotCommand>) {
        if (executing) {
            Log.d(TAG, "Robot ocupado, rechazando requestId=$requestId")
            sendResponse(requestId, ok = false, message = "Robot ocupado")
            return
        }

        Thread {
            executing = true
            try {
                val result = commandRunner.runSequence(commands)
                if (result.isSuccess) {
                    sendResponse(requestId, ok = true, message = "Ejecutado")
                } else {
                    val errorMsg = result.exceptionOrNull()?.message ?: "Error desconocido"
                    sendResponse(requestId, ok = false, message = errorMsg)
                }
            } finally {
                executing = false
            }
        }.start()
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
                if (url != null) connectToUrl(url) else connect()
            }, RECONNECT_DELAY_MS)
        } catch (e: Exception) {
            // Fallback for JVM unit test environments where Looper is not available
            val scheduler = Executors.newSingleThreadScheduledExecutor()
            scheduler.schedule({
                val url = testUrl
                if (url != null) connectToUrl(url) else connect()
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
                "navigate" -> RobotCommand.Navigate(obj.get("location").asString)
                "say" -> RobotCommand.Say(obj.get("text").asString)
                "showImage" -> RobotCommand.ShowImage(
                    imageUrl = obj.get("imageUrl").asString,
                    durationMs = obj.get("durationMs")?.asLong ?: 7000L
                )
                "showVideo" -> RobotCommand.ShowVideo(obj.get("videoUrl").asString)
                "askCondition" -> {
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
                "repeat" -> RobotCommand.Repeat(
                    times = obj.get("times").asInt,
                    commands = parseCommands(obj.getAsJsonArray("commands"))
                )
                "whileCount" -> RobotCommand.WhileCount(
                    limit = obj.get("limit").asInt,
                    commands = parseCommands(obj.getAsJsonArray("commands"))
                )
                "whileTimer" -> RobotCommand.WhileTimer(
                    seconds = obj.get("seconds").asInt,
                    commands = parseCommands(obj.getAsJsonArray("commands"))
                )
                "whileListen" -> RobotCommand.WhileListen(
                    stopWord = obj.get("stopWord").asString,
                    maxIterations = obj.get("maxIterations").asInt,
                    commands = parseCommands(obj.getAsJsonArray("commands"))
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
