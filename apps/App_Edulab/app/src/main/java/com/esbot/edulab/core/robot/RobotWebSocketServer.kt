package com.esbot.edulab.core.robot

import android.util.Log
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import java.net.InetSocketAddress
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "RobotWSServer"
private const val PORT = 8766

@Singleton
class RobotWebSocketServer @Inject constructor(
    private val commandRunner: RobotCommandRunner
) : WebSocketServer(InetSocketAddress(PORT)) {

    @Volatile private var executing = false

    override fun onOpen(conn: WebSocket, handshake: ClientHandshake) {
        Log.d(TAG, "Cliente conectado: ${conn.remoteSocketAddress}")
        // Enviar robotId al cliente que acaba de conectar
        val msg = JsonObject()
        msg.addProperty("type", "connected")
        msg.addProperty("port", PORT)
        conn.send(msg.toString())
    }

    override fun onClose(conn: WebSocket, code: Int, reason: String, remote: Boolean) {
        Log.d(TAG, "Cliente desconectado: code=$code reason=$reason")
    }

    override fun onMessage(conn: WebSocket, text: String) {
        Log.d(TAG, "Mensaje recibido: $text")
        try {
            val json = JsonParser.parseString(text).asJsonObject
            when (json.get("type")?.asString ?: "") {
                "execute" -> {
                    val requestId = json.get("requestId").asString
                    val commands = parseCommands(json.getAsJsonArray("commands"))
                    handleExecute(conn, requestId, commands)
                }
                "locations" -> {
                    val requestId = json.get("requestId").asString
                    handleLocations(conn, requestId)
                }
                else -> Log.w(TAG, "Tipo desconocido")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parseando mensaje: ${e.message}", e)
        }
    }

    override fun onError(conn: WebSocket?, ex: Exception) {
        Log.e(TAG, "Error WebSocket: ${ex.message}", ex)
    }

    override fun onStart() {
        Log.d(TAG, "Servidor WebSocket iniciado en puerto $PORT")
    }

    private fun handleExecute(conn: WebSocket, requestId: String, commands: List<RobotCommand>) {
        if (executing) {
            sendResponse(conn, requestId, ok = false, message = "Robot ocupado")
            return
        }
        Thread {
            executing = true
            try {
                val result = commandRunner.runSequence(commands)
                if (result.isSuccess) {
                    // Emitir evento arrived_ si algún comando fue Navigate
                    commands.filterIsInstance<RobotCommand.Navigate>().forEach { nav ->
                        broadcastArrived(nav.location)
                    }
                    sendResponse(conn, requestId, ok = true, message = "Ejecutado")
                } else {
                    sendResponse(conn, requestId, ok = false,
                        message = result.exceptionOrNull()?.message ?: "Error")
                }
            } finally {
                executing = false
            }
        }.start()

    }

    private fun handleLocations(conn: WebSocket, requestId: String) {
        val locations = getLocationsViaReflection()
        val arr = JsonArray().apply { locations.forEach { add(it) } }
        val msg = JsonObject()
        msg.addProperty("type", "locations_response")
        msg.addProperty("requestId", requestId)
        msg.add("locations", arr)
        try {
            conn.send(msg.toString())
            Log.d(TAG, "LocationsResponse enviado: locations=$locations")
        } catch (e: Exception) {
            Log.e(TAG, "handleLocations falló: ${e.message}")
        }
    }

    private fun sendResponse(conn: WebSocket, requestId: String, ok: Boolean, message: String) {
        val msg = JsonObject()
        msg.addProperty("type", "response")
        msg.addProperty("requestId", requestId)
        msg.addProperty("ok", ok)
        msg.addProperty("message", message)
        try {
            conn.send(msg.toString())
        } catch (e: Exception) {
            Log.e(TAG, "sendResponse falló: ${e.message}")
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun getLocationsViaReflection(): List<String> {
        return try {
            val rClass = Class.forName("com.robotemi.sdk.Robot")
            val robot = rClass.getMethod("getInstance").invoke(null) ?: return emptyList()
            rClass.getMethod("getLocations").invoke(robot) as? List<String> ?: emptyList()
        } catch (e: Exception) {
            Log.e(TAG, "getLocations falló: ${e.message}")
            emptyList()
        }
    }

    // Reutiliza exactamente la misma lógica de parseo que RobotWebSocketClient
    private fun parseCommands(array: JsonArray): List<RobotCommand> {
        val commands = mutableListOf<RobotCommand>()
        for (element in array) {
            parseCommand(element.asJsonObject)?.let { commands.add(it) }
        }
        return commands
    }

    private fun parseCommand(obj: JsonObject): RobotCommand? {
        return try {
            when (obj.get("type")?.asString ?: "") {
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
                    imageUrl = obj.get("imageUrl").asString,
                    durationMs = obj.get("durationMs")?.asLong ?: 7000L
                )
                "showVideo", "ShowVideo" -> RobotCommand.ShowVideo(obj.get("videoUrl").asString)
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
                "askCondition", "AskCondition" -> {
                    val options = obj.getAsJsonArray("options").map { optEl ->
                        val opt = optEl.asJsonObject
                        ConditionOption(
                            keyword = opt.get("keyword").asString,
                            action = parseCommand(opt.getAsJsonObject("action"))
                                ?: RobotCommand.Say("Opción no reconocida")
                        )
                    }
                    RobotCommand.AskCondition(obj.get("question").asString, options)
                }
                else -> null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parseando comando: ${e.message}")
            null
        }
    }
    fun broadcastArrived(location: String) {
        val msg = JsonObject()
        msg.addProperty("type", "event")
        msg.addProperty("event", "arrived_${location.lowercase().trim()}")
        try {
            broadcast(msg.toString())
            Log.d(TAG, "broadcastArrived: $location")
        } catch (e: Exception) {
            Log.e(TAG, "broadcastArrived falló: ${e.message}")
        }
    }

}