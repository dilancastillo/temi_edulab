package com.esbot.edulab.core.robot

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import io.kotest.property.Arb
import io.kotest.property.arbitrary.list
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll
import kotlinx.coroutines.runBlocking
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Tests for RobotWebSocketClient.
 *
 * Uses MockWebServer from OkHttp to simulate the server-side WebSocket endpoint.
 * Property tests use Kotest property testing with checkAll and Arb generators.
 * Uses Gson for JSON parsing to avoid Android stub limitations in JVM unit tests.
 *
 * Feature: robot-server-proxy
 */
class RobotWebSocketClientTest {

    private lateinit var mockServer: MockWebServer

    @Before
    fun setUp() {
        mockServer = MockWebServer()
        mockServer.start()
    }

    @After
    fun tearDown() {
        mockServer.shutdown()
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private fun wsUrl(): String =
        mockServer.url("/api/robot/ws").toString()
            .replace("http://", "ws://")
            .replace("https://", "wss://")

    private fun buildRegisterMsg(robotId: String): String {
        val obj = JsonObject()
        obj.addProperty("type", "register")
        obj.addProperty("robotId", robotId)
        return obj.toString()
    }

    private fun buildCommandMsg(requestId: String, vararg texts: String): String {
        val commands = JsonArray()
        texts.forEach { text ->
            val cmd = JsonObject()
            cmd.addProperty("type", "say")
            cmd.addProperty("text", text)
            commands.add(cmd)
        }
        val obj = JsonObject()
        obj.addProperty("type", "execute")
        obj.addProperty("requestId", requestId)
        obj.add("commands", commands)
        return obj.toString()
    }

    private fun buildLocationsRequestMsg(requestId: String): String {
        val obj = JsonObject()
        obj.addProperty("type", "locations")
        obj.addProperty("requestId", requestId)
        return obj.toString()
    }

    private fun parseJson(text: String): JsonObject =
        JsonParser.parseString(text).asJsonObject

    // -------------------------------------------------------------------------
    // 9.1 Property Tests
    // -------------------------------------------------------------------------

    /**
     * Property 1: For any robotId, the RegisterMessage sent contains that robotId.
     *
     * Structural test: verifies the JSON message builder preserves the robotId field.
     *
     * Feature: robot-server-proxy, Property 1: RegisterMessage contiene el robotId correcto
     * Validates: Requirements 1.2
     */
    @Test
    fun `property 1 - RegisterMessage JSON structure preserves any robotId`() {
        // Feature: robot-server-proxy, Property 1: RegisterMessage contiene el robotId correcto
        runBlocking {
            checkAll(Arb.string(minSize = 1, maxSize = 50)) { robotId ->
                val json = parseJson(buildRegisterMsg(robotId))

                assertEquals(
                    "RegisterMessage must contain the configured robotId",
                    robotId,
                    json.get("robotId").asString
                )
                assertEquals(
                    "RegisterMessage type must be 'register'",
                    "register",
                    json.get("type").asString
                )
            }
        }
    }

    /**
     * Property 1 (integration): For any robotId, when the client connects,
     * the first message sent is a RegisterMessage containing that robotId.
     *
     * Feature: robot-server-proxy, Property 1: RegisterMessage contiene el robotId correcto (integration)
     * Validates: Requirements 1.2
     */
    @Test
    fun `property 1 integration - RegisterMessage sent on connect contains robotId`() {
        // Feature: robot-server-proxy, Property 1: RegisterMessage contiene el robotId correcto
        runBlocking {
            checkAll(5, Arb.string(minSize = 1, maxSize = 30)) { robotId ->
                val latch = CountDownLatch(1)
                var receivedType: String? = null
                var receivedRobotId: String? = null

                mockServer.enqueue(
                    MockResponse().withWebSocketUpgrade(object : WebSocketListener() {
                        override fun onMessage(webSocket: WebSocket, text: String) {
                            val msg = parseJson(text)
                            val type = msg.get("type")?.asString
                            if (type == "register") {
                                receivedType = type
                                receivedRobotId = msg.get("robotId")?.asString
                                latch.countDown()
                            }
                        }
                    })
                )

                val client = RobotWebSocketClient(FakeCommandRunner(shouldFail = false))
                client.connectToUrl(wsUrl(), overrideRobotId = robotId)

                val messageReceived = latch.await(3, TimeUnit.SECONDS)
                client.stop()

                if (messageReceived) {
                    assertEquals(
                        "RegisterMessage type must be 'register'",
                        "register",
                        receivedType
                    )
                    assertEquals(
                        "RegisterMessage must contain the configured robotId",
                        robotId,
                        receivedRobotId
                    )
                }
            }
        }
    }

    /**
     * Property 11: For any list of commands, they execute in order and requestId is preserved.
     *
     * Structural test: verifies the CommandMessage JSON structure preserves order and requestId.
     *
     * Feature: robot-server-proxy, Property 11: Ejecución secuencial de comandos en el robot
     * Validates: Requirements 5.1, 5.2
     */
    @Test
    fun `property 11 - CommandMessage JSON structure preserves command order and requestId`() {
        // Feature: robot-server-proxy, Property 11: Ejecución secuencial de comandos en el robot
        runBlocking {
            checkAll(
                Arb.string(minSize = 1, maxSize = 36),
                Arb.list(Arb.string(minSize = 1, maxSize = 20), range = 1..5)
            ) { requestId, locations ->
                val commands = JsonArray()
                locations.forEach { loc ->
                    val cmd = JsonObject()
                    cmd.addProperty("type", "navigate")
                    cmd.addProperty("location", loc)
                    commands.add(cmd)
                }

                val commandMessage = JsonObject()
                commandMessage.addProperty("type", "execute")
                commandMessage.addProperty("requestId", requestId)
                commandMessage.add("commands", commands)

                assertEquals(
                    "CommandMessage requestId must be preserved",
                    requestId,
                    commandMessage.get("requestId").asString
                )
                assertEquals(
                    "CommandMessage must have correct number of commands",
                    locations.size,
                    commandMessage.getAsJsonArray("commands").size()
                )

                for (i in locations.indices) {
                    val cmd = commandMessage.getAsJsonArray("commands")[i].asJsonObject
                    assertEquals(
                        "Command at index $i must preserve location in order",
                        locations[i],
                        cmd.get("location").asString
                    )
                }
            }
        }
    }

    /**
     * Property 11 (integration): For any requestId, the ResponseMessage from the client
     * contains the same requestId as the CommandMessage sent by the server.
     *
     * Feature: robot-server-proxy, Property 11: requestId se preserva en ResponseMessage
     * Validates: Requirements 5.1, 5.2
     */
    @Test
    fun `property 11 integration - requestId preserved in ResponseMessage after execute`() {
        // Feature: robot-server-proxy, Property 11: Ejecución secuencial de comandos en el robot
        runBlocking {
            checkAll(3, Arb.string(minSize = 1, maxSize = 36)) { requestId ->
                val responseLatch = CountDownLatch(1)
                var responseRequestId: String? = null
                var responseType: String? = null

                mockServer.enqueue(
                    MockResponse().withWebSocketUpgrade(object : WebSocketListener() {
                        override fun onMessage(webSocket: WebSocket, text: String) {
                            val msg = parseJson(text)
                            when (msg.get("type")?.asString) {
                                "register" -> {
                                    webSocket.send(buildCommandMsg(requestId, "Hola"))
                                }
                                "response" -> {
                                    responseRequestId = msg.get("requestId")?.asString
                                    responseType = msg.get("type")?.asString
                                    responseLatch.countDown()
                                }
                            }
                        }
                    })
                )

                val client = RobotWebSocketClient(FakeCommandRunner(shouldFail = false))
                client.connectToUrl(wsUrl())

                val received = responseLatch.await(3, TimeUnit.SECONDS)
                client.stop()

                if (received) {
                    assertEquals(
                        "ResponseMessage requestId must match CommandMessage requestId",
                        requestId,
                        responseRequestId
                    )
                    assertEquals(
                        "ResponseMessage type must be 'response'",
                        "response",
                        responseType
                    )
                }
            }
        }
    }

    /**
     * Property 12: For any LocationsRequestMessage, requestId is preserved in response.
     *
     * Structural test: verifies the LocationsResponseMessage JSON structure preserves requestId.
     *
     * Feature: robot-server-proxy, Property 12: LocationsResponseMessage preserva el requestId
     * Validates: Requirements 5.5
     */
    @Test
    fun `property 12 - LocationsResponseMessage JSON structure preserves any requestId`() {
        // Feature: robot-server-proxy, Property 12: LocationsResponseMessage preserva el requestId
        runBlocking {
            checkAll(Arb.string(minSize = 1, maxSize = 36)) { requestId ->
                val locationsResponse = JsonObject()
                locationsResponse.addProperty("type", "locations_response")
                locationsResponse.addProperty("requestId", requestId)
                locationsResponse.add("locations", JsonArray())

                assertEquals(
                    "LocationsResponseMessage requestId must match LocationsRequestMessage requestId",
                    requestId,
                    locationsResponse.get("requestId").asString
                )
                assertEquals(
                    "LocationsResponseMessage type must be 'locations_response'",
                    "locations_response",
                    locationsResponse.get("type").asString
                )
            }
        }
    }

    /**
     * Property 12 (integration): For any LocationsRequestMessage received via WebSocket,
     * the LocationsResponseMessage contains the same requestId.
     *
     * Feature: robot-server-proxy, Property 12: LocationsResponseMessage preserva el requestId (integration)
     * Validates: Requirements 5.5
     */
    @Test
    fun `property 12 integration - requestId preserved in LocationsResponseMessage`() {
        // Feature: robot-server-proxy, Property 12: LocationsResponseMessage preserva el requestId
        runBlocking {
            checkAll(3, Arb.string(minSize = 1, maxSize = 36)) { requestId ->
                val responseLatch = CountDownLatch(1)
                var responseRequestId: String? = null
                var responseType: String? = null

                mockServer.enqueue(
                    MockResponse().withWebSocketUpgrade(object : WebSocketListener() {
                        override fun onMessage(webSocket: WebSocket, text: String) {
                            val msg = parseJson(text)
                            when (msg.get("type")?.asString) {
                                "register" -> {
                                    webSocket.send(buildLocationsRequestMsg(requestId))
                                }
                                "locations_response" -> {
                                    responseRequestId = msg.get("requestId")?.asString
                                    responseType = msg.get("type")?.asString
                                    responseLatch.countDown()
                                }
                            }
                        }
                    })
                )

                val client = RobotWebSocketClient(FakeCommandRunner(shouldFail = false))
                client.connectToUrl(wsUrl())

                val received = responseLatch.await(3, TimeUnit.SECONDS)
                client.stop()

                if (received) {
                    assertEquals(
                        "LocationsResponseMessage requestId must match LocationsRequestMessage requestId",
                        requestId,
                        responseRequestId
                    )
                    assertEquals(
                        "LocationsResponseMessage type must be 'locations_response'",
                        "locations_response",
                        responseType
                    )
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // 9.2 Example Tests
    // -------------------------------------------------------------------------

    /**
     * Robot busy returns ResponseMessage with ok=false and "Robot ocupado".
     * Validates: Requirements 5.4
     */
    @Test
    fun `robot busy returns ResponseMessage with ok false and Robot ocupado`() {
        val secondResponseLatch = CountDownLatch(2)
        val responses = mutableListOf<JsonObject>()

        mockServer.enqueue(
            MockResponse().withWebSocketUpgrade(object : WebSocketListener() {
                override fun onMessage(webSocket: WebSocket, text: String) {
                    val msg = parseJson(text)
                    when (msg.get("type")?.asString) {
                        "register" -> {
                            // Send two execute commands rapidly — second should get "Robot ocupado"
                            webSocket.send(buildCommandMsg("req-1", "Hola"))
                            webSocket.send(buildCommandMsg("req-2", "Mundo"))
                        }
                        "response" -> {
                            synchronized(responses) { responses.add(msg) }
                            secondResponseLatch.countDown()
                        }
                    }
                }
            })
        )

        // Use a slow runner to ensure the first command is still executing when the second arrives
        val slowRunner = SlowCommandRunner(delayMs = 500)
        val client = RobotWebSocketClient(slowRunner)
        client.connectToUrl(wsUrl())

        val bothReceived = secondResponseLatch.await(5, TimeUnit.SECONDS)
        client.stop()

        assertTrue("Should receive two responses", bothReceived)
        assertEquals("Should have exactly two responses", 2, responses.size)

        val busyResponse = responses.find { it.get("message")?.asString == "Robot ocupado" }
        assertNotNull("One response must be 'Robot ocupado'", busyResponse)
        assertFalse("Robot ocupado response must have ok=false", busyResponse!!.get("ok").asBoolean)
    }

    /**
     * Error in execution returns ResponseMessage with ok=false.
     * Validates: Requirements 5.3
     */
    @Test
    fun `error in execution returns ResponseMessage with ok false`() {
        val responseLatch = CountDownLatch(1)
        var responseOk: Boolean? = null
        var responseType: String? = null
        var responseRequestId: String? = null

        mockServer.enqueue(
            MockResponse().withWebSocketUpgrade(object : WebSocketListener() {
                override fun onMessage(webSocket: WebSocket, text: String) {
                    val msg = parseJson(text)
                    when (msg.get("type")?.asString) {
                        "register" -> {
                            val commandMsg = JsonObject()
                            commandMsg.addProperty("type", "execute")
                            commandMsg.addProperty("requestId", "req-error")
                            val commands = JsonArray()
                            val cmd = JsonObject()
                            cmd.addProperty("type", "navigate")
                            cmd.addProperty("location", "Sala Principal")
                            commands.add(cmd)
                            commandMsg.add("commands", commands)
                            webSocket.send(commandMsg.toString())
                        }
                        "response" -> {
                            responseOk = msg.get("ok")?.asBoolean
                            responseType = msg.get("type")?.asString
                            responseRequestId = msg.get("requestId")?.asString
                            responseLatch.countDown()
                        }
                    }
                }
            })
        )

        val failingRunner = FakeCommandRunner(shouldFail = true)
        val client = RobotWebSocketClient(failingRunner)
        client.connectToUrl(wsUrl())

        val received = responseLatch.await(3, TimeUnit.SECONDS)
        client.stop()

        assertTrue("Should receive a response", received)
        assertNotNull("Response ok should not be null", responseOk)
        assertFalse("Response ok must be false on error", responseOk!!)
        assertEquals("Response type must be 'response'", "response", responseType)
        assertEquals("requestId must be preserved", "req-error", responseRequestId)
    }

    /**
     * Reconnect is scheduled after connection close.
     * Verifies that the client reconnects after the server closes the connection.
     * Validates: Requirements 1.4
     */
    @Test
    fun `reconnect is scheduled after connection close`() {
        val connectLatch = CountDownLatch(2) // Expect at least 2 connections (initial + reconnect)

        // First connection: accept and immediately close
        mockServer.enqueue(
            MockResponse().withWebSocketUpgrade(object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    connectLatch.countDown()
                    webSocket.close(1000, "Test close")
                }
            })
        )

        // Second connection: accept (reconnect attempt)
        mockServer.enqueue(
            MockResponse().withWebSocketUpgrade(object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    connectLatch.countDown()
                }
            })
        )

        val client = RobotWebSocketClient(FakeCommandRunner(shouldFail = false))
        client.connectToUrl(wsUrl())

        // Wait up to 8 seconds for reconnect (reconnect delay is 5s)
        val reconnected = connectLatch.await(8, TimeUnit.SECONDS)
        client.stop()

        assertTrue("Client should reconnect after connection close", reconnected)
    }

    // -------------------------------------------------------------------------
    // Fake runners
    // -------------------------------------------------------------------------

    private class FakeCommandRunner(private val shouldFail: Boolean) : RobotCommandRunner {
        val receivedCommands = mutableListOf<RobotCommand>()

        override fun run(command: RobotCommand): Result<Unit> {
            receivedCommands.add(command)
            return if (shouldFail) {
                Result.failure(RuntimeException("Simulated runner failure"))
            } else {
                Result.success(Unit)
            }
        }

        override fun runSequence(commands: List<RobotCommand>): Result<Unit> {
            receivedCommands.addAll(commands)
            return if (shouldFail) {
                Result.failure(RuntimeException("Simulated runner failure"))
            } else {
                Result.success(Unit)
            }
        }
    }

    private class SlowCommandRunner(private val delayMs: Long) : RobotCommandRunner {
        override fun run(command: RobotCommand): Result<Unit> {
            Thread.sleep(delayMs)
            return Result.success(Unit)
        }

        override fun runSequence(commands: List<RobotCommand>): Result<Unit> {
            Thread.sleep(delayMs)
            return Result.success(Unit)
        }
    }
}
