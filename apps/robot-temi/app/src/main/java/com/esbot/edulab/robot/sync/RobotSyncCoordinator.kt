package com.esbot.edulab.robot.sync

import android.util.Log
import com.esbot.edulab.robot.data.repository.RobotRepository
import com.esbot.edulab.robot.model.RobotPhase
import com.esbot.edulab.robot.runtime.MissionRuntimeEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class RobotSyncCoordinator(
    private val repository: RobotRepository,
    private val runtimeEngine: MissionRuntimeEngine,
    private val preferencesStore: RobotSyncPreferencesStore,
    private val api: RobotSyncApi,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    @Volatile private var started = false

    private var currentSessionId: String? = null
    private var currentSessionStatus: String? = null
    private var currentRuntimeFingerprint: String? = null
    private var lastLocationsFingerprint: String? = null
    private var startedEventSessionId: String? = null
    private var completedEventSessionId: String? = null
    private var lastSafeFingerprint: String? = null
    private var lastErrorFingerprint: String? = null
    private var lastPauseFingerprint: String? = null

    fun start() {
        if (started) return
        started = true

        scope.launch { pairingLoop() }
        scope.launch { heartbeatLoop() }
        scope.launch { sessionLoop() }
    }

    fun updateApiBaseUrl(rawValue: String) {
        scope.launch {
            preferencesStore.updateBaseUrl(rawValue)
            repository.updateSyncState(
                apiBaseUrl = rawValue.trim().trimEnd('/'),
                syncStatusLabel =
                    if (rawValue.isBlank()) {
                        "Configura la URL del backend"
                    } else {
                        "URL guardada. Lista para vincular."
                    },
            )
        }
    }

    fun requestPairingNow() {
        scope.launch {
            try {
                val preferences = preferencesStore.current()
                if (preferences.apiBaseUrl.isBlank()) {
                    repository.updateSyncState(
                        pairingStatusLabel = "Falta la URL",
                        syncStatusLabel = "Primero escribe la URL del backend.",
                    )
                    return@launch
                }
                if (!preferences.robotToken.isNullOrBlank()) {
                    repository.updateSyncState(
                        pairingStatusLabel = "Robot vinculado",
                        syncStatusLabel = "Este Temi ya tiene un token activo.",
                    )
                    return@launch
                }

                preferencesStore.clearPendingPairing()
                createPairingRequest(preferences.apiBaseUrl)
            } catch (error: Throwable) {
                Log.w("RobotSyncCoordinator", "Manual pairing request failed", error)
                repository.updateSyncState(
                    pairingStatusLabel = "Sin vinculacion",
                    syncStatusLabel = error.message ?: "No pudimos crear el codigo de vinculacion.",
                )
            }
        }
    }

    fun syncNow() {
        scope.launch {
            try {
                syncLocationsOnce()
                sendHeartbeatOnce()
                pollSessionOnce()
            } catch (error: Throwable) {
                Log.w("RobotSyncCoordinator", "Manual sync failed", error)
                repository.updateSyncState(
                    syncStatusLabel = error.message ?: "No pudimos sincronizar con la plataforma.",
                )
            }
        }
    }

    private suspend fun pairingLoop() {
        while (scope.isActive) {
            try {
                val preferences = preferencesStore.current()
                repository.updateSyncState(
                    apiBaseUrl = preferences.apiBaseUrl,
                    pairCode = preferences.pairCode,
                    sessionUri = preferences.sessionUri,
                    pairingStatusLabel =
                        if (preferences.robotToken.isNullOrBlank()) {
                            if (preferences.pairingRequestId.isNullOrBlank()) "Sin vinculacion" else "Esperando confirmacion web"
                        } else {
                            "Robot vinculado"
                        },
                )

                if (preferences.apiBaseUrl.isBlank()) {
                    repository.updateSyncState(syncStatusLabel = "Configura la URL del backend")
                    delay(3000)
                    continue
                }

                if (!preferences.robotToken.isNullOrBlank()) {
                    repository.updateSyncState(syncStatusLabel = "Sincronizacion activa")
                    delay(5000)
                    continue
                }

                if (preferences.pairingRequestId.isNullOrBlank()) {
                    createPairingRequest(preferences.apiBaseUrl)
                    delay(5000)
                    continue
                }

                val pollResult = api.pollPairingRequest(preferences.apiBaseUrl, preferences.pairingRequestId)
                when {
                    !pollResult.robotToken.isNullOrBlank() -> {
                        preferencesStore.completePairing(pollResult.robotId, pollResult.robotToken)
                        repository.updateSyncState(
                            pairingStatusLabel = "Robot vinculado",
                            syncStatusLabel = "Token recibido. Iniciando sincronizacion...",
                            pairCode = pollResult.pairCode ?: preferences.pairCode,
                            sessionUri = pollResult.sessionUri ?: preferences.sessionUri,
                        )
                        syncLocationsOnce()
                    }

                    pollResult.status == "expired" -> {
                        preferencesStore.clearPendingPairing()
                        repository.updateSyncState(
                            pairingStatusLabel = "Codigo vencido",
                            syncStatusLabel = "Genera un codigo nuevo.",
                        )
                    }

                    else -> {
                        repository.updateSyncState(
                            pairingStatusLabel = "Esperando confirmacion web",
                            syncStatusLabel = "Confirma este Temi desde la plataforma.",
                            pairCode = pollResult.pairCode ?: preferences.pairCode,
                            sessionUri = pollResult.sessionUri ?: preferences.sessionUri,
                        )
                    }
                }
            } catch (error: Throwable) {
                Log.w("RobotSyncCoordinator", "Pairing loop error", error)
                repository.updateSyncState(syncStatusLabel = error.message ?: "No pudimos sincronizar con la plataforma.")
            }
            delay(5000)
        }
    }

    private suspend fun heartbeatLoop() {
        while (scope.isActive) {
            try {
                syncLocationsOnce()
                sendHeartbeatOnce()
            } catch (error: Throwable) {
                Log.w("RobotSyncCoordinator", "Heartbeat loop error", error)
                repository.updateSyncState(syncStatusLabel = error.message ?: "No pudimos enviar el heartbeat.")
            }
            delay(5000)
        }
    }

    private suspend fun sessionLoop() {
        while (scope.isActive) {
            try {
                pollSessionOnce()
            } catch (error: Throwable) {
                Log.w("RobotSyncCoordinator", "Session loop error", error)
                repository.updateSyncState(syncStatusLabel = error.message ?: "No pudimos descargar la sesion.")
            }
            delay(4000)
        }
    }

    private suspend fun createPairingRequest(baseUrl: String) {
        val snapshot = repository.currentSnapshot()
        val result =
            api.createPairingRequest(
                baseUrl = baseUrl,
                proposedName = snapshot.assignedRobotName,
                classroomName = snapshot.classroomName,
                sessionUri = snapshot.sessionUri,
            )
        preferencesStore.savePendingPairing(result.pairingRequestId, result.pairCode, result.sessionUri ?: snapshot.sessionUri)
        repository.updateSyncState(
            apiBaseUrl = baseUrl,
            pairingStatusLabel = "Codigo listo para la web",
            syncStatusLabel = "Confirma este codigo desde la plataforma.",
            pairCode = result.pairCode,
            sessionUri = result.sessionUri ?: snapshot.sessionUri,
        )
    }

    private suspend fun syncLocationsOnce() {
        val preferences = preferencesStore.current()
        if (preferences.apiBaseUrl.isBlank() || preferences.robotToken.isNullOrBlank()) return

        val diagnostics = repository.refreshDiagnostics()
        if (diagnostics.locations.isEmpty()) return

        val fingerprint =
            diagnostics.locations.joinToString("|") { "${it.name}:${it.available}:${it.detail.orEmpty()}" }
        if (fingerprint == lastLocationsFingerprint) return

        api.syncLocations(preferences.apiBaseUrl, preferences.robotToken, diagnostics.locations)
        lastLocationsFingerprint = fingerprint
        repository.updateSyncState(syncStatusLabel = "Ubicaciones sincronizadas")
    }

    private suspend fun sendHeartbeatOnce() {
        val preferences = preferencesStore.current()
        if (preferences.apiBaseUrl.isBlank() || preferences.robotToken.isNullOrBlank()) return

        val snapshot = repository.currentSnapshot()
        val payload =
            JSONObject()
                .put("connectionState", snapshot.connectionState)
                .put("batteryPercent", snapshot.batteryPercent)
                .put("statusLabel", snapshot.robotStatusLabel)
                .put("classSessionId", currentSessionId)
                .put("currentStepLabel", snapshot.currentStepLabel)
                .put("progressPercent", snapshot.progressPercent)

        api.heartbeat(preferences.apiBaseUrl, preferences.robotToken, payload)
        emitTransitionEvents(preferences, snapshot)
        repository.updateSyncState(syncStatusLabel = "Ultimo pulso: ${timeLabel()}")
    }

    private suspend fun pollSessionOnce() {
        val preferences = preferencesStore.current()
        if (preferences.apiBaseUrl.isBlank() || preferences.robotToken.isNullOrBlank()) return

        val remoteSession = api.fetchNextSession(preferences.apiBaseUrl, preferences.robotToken)
        if (remoteSession == null) {
            currentSessionId = null
            currentSessionStatus = null
            currentRuntimeFingerprint = null
            repository.updateSyncState(syncStatusLabel = "Sin sesiones activas")
            return
        }

        val mission =
            RemoteMissionParser.parseClassroomGuide(
                runtime = remoteSession.missionRuntime,
                activeStudentName = remoteSession.activeStudentName,
            ) ?: run {
                repository.updateSyncState(syncStatusLabel = "La plataforma envio un runtime que Temi no reconoce.")
                return
            }

        val runtimeFingerprint = remoteSession.missionRuntime.toString()
        val shouldReloadMission =
            currentSessionId != remoteSession.id || currentRuntimeFingerprint != runtimeFingerprint

        if (shouldReloadMission) {
            resetEventMarkers(remoteSession.id)
            currentSessionId = remoteSession.id
            currentRuntimeFingerprint = runtimeFingerprint
            runtimeEngine.loadRemoteSession(mission, remoteSession.activeStudentName)
            repository.updateSyncState(
                classroomName = mission.classroom,
                syncStatusLabel = "Sesion recibida: ${remoteSession.missionTitle}",
            )
        }

        val snapshot = repository.currentSnapshot()
        when (remoteSession.status) {
            "ready", "running" -> {
                if (snapshot.waitingTeacher || shouldReloadMission) {
                    runtimeEngine.approveTeacherGate()
                }
            }

            "paused" -> runtimeEngine.syncPauseFromPlatform("Pausa recibida desde la plataforma")
            "safe_mode" -> runtimeEngine.syncSafeMode("La plataforma pidio detener la sesion.")
            "error" -> runtimeEngine.syncPauseFromPlatform("La plataforma marco un error y detuvo la sesion.")
        }

        currentSessionStatus = remoteSession.status
    }

    private suspend fun emitTransitionEvents(
        preferences: RobotSyncPreferences,
        snapshot: com.esbot.edulab.robot.data.local.RobotSnapshotEntity,
    ) {
        val sessionId = currentSessionId ?: return

        if (!snapshot.waitingTeacher && snapshot.activeMissionId != null && startedEventSessionId != sessionId) {
            postEvent(
                preferences = preferences,
                eventType = "STARTED",
                sessionId = sessionId,
                payload =
                    JSONObject()
                        .put("currentStepLabel", snapshot.currentStepLabel)
                        .put("progressPercent", snapshot.progressPercent),
            )
            startedEventSessionId = sessionId
        }

        val safeFingerprint = "$sessionId:${snapshot.safeModeReason.orEmpty()}"
        if (snapshot.safeModeActive && lastSafeFingerprint != safeFingerprint) {
            postEvent(
                preferences = preferences,
                eventType = "SAFE_MODE",
                sessionId = sessionId,
                payload =
                    JSONObject()
                        .put("currentStepLabel", snapshot.currentStepLabel)
                        .put("progressPercent", snapshot.progressPercent)
                        .put("reason", snapshot.safeModeReason),
            )
            lastSafeFingerprint = safeFingerprint
        }

        val errorFingerprint = "$sessionId:${snapshot.lastErrorTitle.orEmpty()}:${snapshot.lastErrorMessage.orEmpty()}"
        if (!snapshot.lastErrorTitle.isNullOrBlank() && lastErrorFingerprint != errorFingerprint) {
            postEvent(
                preferences = preferences,
                eventType = "ERROR",
                sessionId = sessionId,
                payload =
                    JSONObject()
                        .put("currentStepLabel", snapshot.currentStepLabel)
                        .put("progressPercent", snapshot.progressPercent)
                        .put("title", snapshot.lastErrorTitle)
                        .put("message", snapshot.lastErrorMessage),
            )
            lastErrorFingerprint = errorFingerprint
        }

        val pauseFingerprint = "$sessionId:${snapshot.progressPercent}:${snapshot.currentStepLabel.orEmpty()}"
        if (snapshot.classPhase == RobotPhase.ClassInProgress &&
            !snapshot.waitingTeacher &&
            snapshot.progressPercent in 1..99 &&
            lastPauseFingerprint != pauseFingerprint
        ) {
            postEvent(
                preferences = preferences,
                eventType = "PAUSED",
                sessionId = sessionId,
                payload =
                    JSONObject()
                        .put("currentStepLabel", snapshot.currentStepLabel)
                        .put("progressPercent", snapshot.progressPercent),
            )
            lastPauseFingerprint = pauseFingerprint
        }

        if (snapshot.progressPercent >= 100 && completedEventSessionId != sessionId) {
            postEvent(
                preferences = preferences,
                eventType = "COMPLETED",
                sessionId = sessionId,
                payload =
                    JSONObject()
                        .put("currentStepLabel", snapshot.currentStepLabel)
                        .put("progressPercent", snapshot.progressPercent),
            )
            completedEventSessionId = sessionId
        }
    }

    private suspend fun postEvent(
        preferences: RobotSyncPreferences,
        eventType: String,
        sessionId: String,
        payload: JSONObject,
    ) {
        if (preferences.apiBaseUrl.isBlank() || preferences.robotToken.isNullOrBlank()) return

        api.postEvent(
            preferences.apiBaseUrl,
            preferences.robotToken,
            JSONObject()
                .put("classSessionId", sessionId)
                .put("idempotencyKey", "$eventType-$sessionId-${payload.optInt("progressPercent", 0)}-${payload.optString("currentStepLabel")}")
                .put("eventType", eventType)
                .put("payload", payload),
        )
    }

    private fun resetEventMarkers(sessionId: String) {
        startedEventSessionId = null
        completedEventSessionId = null
        lastSafeFingerprint = null
        lastErrorFingerprint = null
        lastPauseFingerprint = null
        currentSessionId = sessionId
    }

    private fun timeLabel(): String {
        return SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
    }
}
