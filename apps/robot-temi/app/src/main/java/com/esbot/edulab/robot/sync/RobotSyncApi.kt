package com.esbot.edulab.robot.sync

import com.esbot.edulab.robot.model.RobotLocationDiagnostic
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.ConnectException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.net.URL

data class PairingInitResult(
    val pairingRequestId: String,
    val pairCode: String,
    val sessionUri: String?,
)

data class PairingPollResult(
    val status: String,
    val pairCode: String?,
    val sessionUri: String?,
    val robotToken: String?,
    val robotId: String?,
)

data class RemoteClassSession(
    val id: String,
    val status: String,
    val missionTitle: String,
    val missionRuntime: JSONObject,
    val activeStudentName: String?,
    val currentStepLabel: String?,
    val progressPercent: Int,
    val approvedAt: String?,
)

class RobotSyncApi {
    suspend fun createPairingRequest(
        baseUrl: String,
        proposedName: String,
        classroomName: String?,
        sessionUri: String?,
    ): PairingInitResult = withContext(Dispatchers.IO) {
        val payload =
            JSONObject()
                .put("proposedName", proposedName)
                .put("classroomName", classroomName)
                .put("sessionUri", sessionUri)

        val response = requestJson(baseUrl, "/v1/robot/pairing-requests", "POST", payload)
        val pairingRequest = response.getJSONObject("pairingRequest")
        PairingInitResult(
            pairingRequestId = pairingRequest.getString("id"),
            pairCode = pairingRequest.getString("code"),
            sessionUri = pairingRequest.optString("sessionUri").takeIf { it.isNotBlank() },
        )
    }

    suspend fun pollPairingRequest(
        baseUrl: String,
        pairingRequestId: String,
    ): PairingPollResult = withContext(Dispatchers.IO) {
        val response = requestJson(baseUrl, "/v1/robot/pairing-requests/$pairingRequestId")
        val pairingRequest = response.getJSONObject("pairingRequest")
        PairingPollResult(
            status = pairingRequest.getString("status"),
            pairCode = pairingRequest.optString("code").takeIf { it.isNotBlank() },
            sessionUri = pairingRequest.optString("sessionUri").takeIf { it.isNotBlank() },
            robotToken = response.optString("robotToken").takeIf { it.isNotBlank() },
            robotId = response.optString("robotId").takeIf { it.isNotBlank() },
        )
    }

    suspend fun syncLocations(
        baseUrl: String,
        robotToken: String,
        locations: List<RobotLocationDiagnostic>,
    ) = withContext(Dispatchers.IO) {
        val payload =
            JSONObject().put(
                "locations",
                JSONArray().apply {
                    locations.forEach { location ->
                        put(
                            JSONObject()
                                .put("name", location.name)
                                .put("available", location.available)
                                .put("detail", location.detail),
                        )
                    }
                },
            )
        requestJson(baseUrl, "/v1/robot/locations/sync", "POST", payload, robotToken)
    }

    suspend fun heartbeat(
        baseUrl: String,
        robotToken: String,
        payload: JSONObject,
    ) = withContext(Dispatchers.IO) {
        requestJson(baseUrl, "/v1/robot/heartbeat", "POST", payload, robotToken)
    }

    suspend fun fetchNextSession(
        baseUrl: String,
        robotToken: String,
    ): RemoteClassSession? = withContext(Dispatchers.IO) {
        val response = requestJson(baseUrl, "/v1/robot/sessions/next", "GET", null, robotToken)
        if (response.isNull("classSession")) {
            return@withContext null
        }

        val classSession = response.getJSONObject("classSession")
        val missionRuntime = classSession.optJSONObject("missionRuntime") ?: return@withContext null
        RemoteClassSession(
            id = classSession.getString("id"),
            status = classSession.getString("status"),
            missionTitle = classSession.optString("missionTitle"),
            missionRuntime = missionRuntime,
            activeStudentName = classSession.optString("activeStudentName").takeIf { it.isNotBlank() },
            currentStepLabel = classSession.optString("currentStepLabel").takeIf { it.isNotBlank() },
            progressPercent = classSession.optInt("progressPercent", 0),
            approvedAt = classSession.optString("approvedAt").takeIf { it.isNotBlank() },
        )
    }

    suspend fun postEvent(
        baseUrl: String,
        robotToken: String,
        payload: JSONObject,
    ) = withContext(Dispatchers.IO) {
        requestJson(baseUrl, "/v1/robot/events", "POST", payload, robotToken)
    }

    private fun requestJson(
        baseUrl: String,
        path: String,
        method: String = "GET",
        payload: JSONObject? = null,
        bearerToken: String? = null,
    ): JSONObject {
        val url = URL("${baseUrl.trimEnd('/')}$path")
        try {
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 10_000
                readTimeout = 10_000
                setRequestProperty("Accept", "application/json")
                if (!bearerToken.isNullOrBlank()) {
                    setRequestProperty("Authorization", "Bearer $bearerToken")
                }
                if (payload != null) {
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    outputStream.use { stream ->
                        stream.write(payload.toString().toByteArray(Charsets.UTF_8))
                    }
                }
            }

            val statusCode = connection.responseCode
            val stream =
                if (statusCode in 200..299) {
                    connection.inputStream
                } else {
                    connection.errorStream ?: connection.inputStream
                }

            val responseBody =
                stream.use { input ->
                    BufferedReader(InputStreamReader(input)).readText()
                }

            if (statusCode !in 200..299) {
                val message =
                    runCatching {
                        JSONObject(responseBody).optString("message")
                    }.getOrNull().takeUnless { it.isNullOrBlank() }
                        ?: "La plataforma respondio con error $statusCode."
                throw IllegalStateException(message)
            }

            return if (responseBody.isBlank()) JSONObject() else JSONObject(responseBody)
        } catch (_: UnknownHostException) {
            throw IllegalStateException("No pudimos encontrar ${url.host}. Revisa la IP del backend.")
        } catch (_: ConnectException) {
            val portLabel = if (url.port > 0) ":${url.port}" else ""
            throw IllegalStateException(
                "No pudimos conectar con ${url.host}$portLabel. Revisa que la API este corriendo y que el firewall permita ese puerto.",
            )
        } catch (_: SocketTimeoutException) {
            val portLabel = if (url.port > 0) ":${url.port}" else ""
            throw IllegalStateException(
                "La plataforma en ${url.host}$portLabel tardo demasiado en responder. Revisa la red del aula.",
            )
        }
    }
}
