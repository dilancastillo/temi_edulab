package com.esbot.edulab.core.robot

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Integration tests for the POST /execute endpoint of TemiLocationServer.
 *
 * A real server instance is started on an OS-assigned free port (port=0).
 * A fake RobotCommandRunner is injected to control success/failure behaviour.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
class TemiLocationServerExecuteTest {

    private lateinit var server: TemiLocationServer
    private var fakeRunner: FakeCommandRunner = FakeCommandRunner(shouldFail = false)
    private var baseUrl: String = ""

    @Before
    fun setUp() {
        fakeRunner = FakeCommandRunner(shouldFail = false)
        // Port 0 → OS picks a free port
        server = TemiLocationServer(fakeRunner, port = 0)
        server.start()
        // Give the server thread a moment to bind
        Thread.sleep(100)
        baseUrl = "http://localhost:${server.localPort}"
    }

    @After
    fun tearDown() {
        server.stop()
    }

    // -------------------------------------------------------------------------
    // 5.1 / 5.2 — Valid Navigate body → 200 ok:true
    // -------------------------------------------------------------------------

    @Test
    fun `valid Navigate body returns 200 with ok true`() {
        val body = """{"commands":[{"type":"Navigate","location":"Sala Principal"}]}"""
        val (code, json) = post("/execute", body)

        assertEquals(200, code)
        assertTrue("Expected ok:true in response: $json", json.contains("\"ok\":true"))
    }

    // -------------------------------------------------------------------------
    // 5.3 — Malformed JSON body → 400 ok:false
    // -------------------------------------------------------------------------

    @Test
    fun `malformed JSON body returns 400 with ok false`() {
        val body = "this is not json at all"
        val (code, json) = post("/execute", body)

        assertEquals(400, code)
        assertTrue("Expected ok:false in response: $json", json.contains("\"ok\":false"))
    }

    // -------------------------------------------------------------------------
    // 5.4 — Unknown command type → ignored → 400 (no valid Navigate)
    // -------------------------------------------------------------------------

    @Test
    fun `unknown command type is ignored and returns 400`() {
        // Only unknown types → no Navigate commands → parseCommandsFromJson returns null → 400
        val body = """{"commands":[{"type":"Say","text":"Hello"}]}"""
        val (code, json) = post("/execute", body)

        assertEquals(400, code)
        assertTrue("Expected ok:false in response: $json", json.contains("\"ok\":false"))
    }

    // -------------------------------------------------------------------------
    // 5.5 — commandRunner fails → 500 ok:false
    // -------------------------------------------------------------------------

    @Test
    fun `commandRunner failure returns 500 with ok false`() {
        // Restart server with a failing runner
        server.stop()
        Thread.sleep(50)
        fakeRunner = FakeCommandRunner(shouldFail = true)
        server = TemiLocationServer(fakeRunner, port = 0)
        server.start()
        Thread.sleep(100)
        baseUrl = "http://localhost:${server.localPort}"

        val body = """{"commands":[{"type":"Navigate","location":"Sala Principal"}]}"""
        val (code, json) = post("/execute", body)

        assertEquals(500, code)
        assertTrue("Expected ok:false in response: $json", json.contains("\"ok\":false"))
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Sends a raw HTTP POST and returns (statusCode, responseBody). */
    private fun post(path: String, body: String): Pair<Int, String> {
        val url = URL("$baseUrl$path")
        val conn = url.openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            val bytes = body.toByteArray(Charsets.UTF_8)
            conn.setRequestProperty("Content-Length", bytes.size.toString())
            conn.connectTimeout = 3000
            conn.readTimeout = 3000

            conn.outputStream.use { it.write(bytes) }

            val code = conn.responseCode
            val responseStream = if (code in 200..299) conn.inputStream else conn.errorStream
            val responseBody = responseStream?.bufferedReader()?.readText() ?: ""
            code to responseBody
        } finally {
            conn.disconnect()
        }
    }

    // -------------------------------------------------------------------------
    // Fake runner
    // -------------------------------------------------------------------------

    private class FakeCommandRunner(private val shouldFail: Boolean) : RobotCommandRunner {
        override fun run(command: RobotCommand): Result<Unit> {
            return if (shouldFail) {
                Result.failure(RuntimeException("Simulated runner failure"))
            } else {
                Result.success(Unit)
            }
        }
    }
}
