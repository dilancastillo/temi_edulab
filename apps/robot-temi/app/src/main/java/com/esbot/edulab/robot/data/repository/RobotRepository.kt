package com.esbot.edulab.robot.data.repository

import com.esbot.edulab.robot.data.local.MapLocationEntity
import com.esbot.edulab.robot.data.local.QueueCommandEntity
import com.esbot.edulab.robot.data.local.RobotDao
import com.esbot.edulab.robot.data.local.RobotSnapshotEntity
import com.esbot.edulab.robot.data.local.SafetyIncidentEntity
import com.esbot.edulab.robot.model.BannerState
import com.esbot.edulab.robot.model.CommandType
import com.esbot.edulab.robot.model.IncidentSeverity
import com.esbot.edulab.robot.model.IncidentStatus
import com.esbot.edulab.robot.model.MissionDefinition
import com.esbot.edulab.robot.model.QueueStatus
import com.esbot.edulab.robot.model.RobotDiagnostics
import com.esbot.edulab.robot.model.RobotPhase
import com.esbot.edulab.robot.model.SafetyViolation
import com.esbot.edulab.robot.runtime.MissionCatalog
import com.esbot.edulab.robot.runtime.RobotBridge
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

data class RobotStore(
    val snapshot: RobotSnapshotEntity,
    val queue: List<QueueCommandEntity>,
    val locations: List<MapLocationEntity>,
    val incidents: List<SafetyIncidentEntity>,
)

class RobotRepository(
    private val dao: RobotDao,
    private val bridge: RobotBridge,
) {
    private val lock = Mutex()

    val store: Flow<RobotStore> =
        combine(
            dao.observeSnapshot(),
            dao.observeQueue(),
            dao.observeLocations(),
            dao.observeIncidents(),
        ) { snapshot, queue, locations, incidents ->
            RobotStore(
                snapshot = snapshot ?: defaultSnapshot(),
                queue = queue,
                locations = locations,
                incidents = incidents,
            )
        }

    suspend fun seedIfNeeded() {
        lock.withLock {
            if (dao.getSnapshot() == null) {
                dao.upsertSnapshot(defaultSnapshot())
            }
            if (dao.getLocations().isEmpty()) {
                dao.replaceLocations(defaultLocations())
            }
        }
    }

    suspend fun refreshDiagnostics(): RobotDiagnostics {
        val diagnostics = bridge.fetchDiagnostics()
        val now = now()
        if (diagnostics.locations.isNotEmpty()) {
            val mergedLocations = mergeLocations(defaultLocations(), diagnostics.locations.map { location ->
                MapLocationEntity(
                    name = location.name,
                    floorLabel = "Piso principal",
                    available = location.available,
                    detail = location.detail,
                    lastValidatedAt = now,
                )
            })
            dao.replaceLocations(mergedLocations)
        }
        updateSnapshot { current ->
            current.copy(
                connectionState = diagnostics.connectionState,
                batteryPercent = diagnostics.batteryPercent,
                batteryCharging = diagnostics.isCharging,
                bannerState =
                    when {
                        current.safeModeActive -> BannerState.SafeMode
                        diagnostics.connectionState != "CONNECTED" -> BannerState.Offline
                        current.classPhase == RobotPhase.Execution -> BannerState.Running
                        current.waitingTeacher || current.classPhase == RobotPhase.ClassInProgress -> BannerState.Paused
                        else -> BannerState.Ready
                    },
                robotStatusLabel =
                    when {
                        current.classPhase == RobotPhase.Execution || current.classPhase == RobotPhase.Interaction || current.classPhase == RobotPhase.Error -> current.robotStatusLabel
                        else -> diagnostics.rawStatus.humanize(current.languageCode)
                    },
                currentActionHint = current.currentActionHint.ifBlankOrNull {
                    esOrEn(current.languageCode, "Temi esta listo para la clase.", "Temi is ready for class.")
                },
                lastUpdatedAt = now,
            )
        }
        return diagnostics
    }

    suspend fun startClassSession(
        studentName: String = "Equipo azul",
        mission: MissionDefinition = MissionCatalog.classroomGuideMission(),
    ) {
        val now = now()
        val activeTurn = mission.turnQueue.firstOrNull() ?: studentName
        val nextTurn = mission.turnQueue.getOrNull(1)

        dao.clearIncidents()
        dao.replaceQueue(MissionCatalog.run { mission.toQueueEntities(now) })
        updateSnapshot { current ->
            current.copy(
                classroomName = mission.classroom,
                teacherName = mission.teacherName,
                nextTurnName = nextTurn,
                activeMissionId = mission.id,
                activeMissionName = mission.title,
                activeStudentName = activeTurn,
                currentStepLabel = esOrEn(current.languageCode, "Esperando aprobacion del docente", "Waiting for teacher approval"),
                currentActionHint = mission.welcomeLine,
                classPhase = RobotPhase.ClassInProgress,
                bannerState = BannerState.Paused,
                progressPercent = 0,
                robotStatusLabel = esOrEn(current.languageCode, "Temi listo para este turno", "Temi ready for this turn"),
                waitingTeacher = true,
                safeModeActive = false,
                safeModeReason = null,
                lastErrorTitle = null,
                lastErrorMessage = null,
                studentCanResolve = false,
                autoRetryPlanned = false,
                promptTitle = null,
                promptBody = null,
                promptOptions = null,
                promptExpectedAnswer = null,
                promptCountdownSeconds = null,
                studentModeLabel = mission.studentModeLabel,
                deviceModeLabel = mission.deviceModeLabel,
                executionModeLabel = mission.executionModeLabel,
                baseLocationName = mission.baseLocationName,
                routePreviewCsv = mission.routeStops.joinToString("|") { it.alias },
                allowVoice = true,
                allowButtons = true,
                allowTouch = true,
                lastUpdatedAt = now,
            )
        }
    }

    suspend fun approveTeacherStart() {
        val now = now()
        val progress = progressPercent()
        val pending = dao.getNextPendingCommand()
        if (pending?.commandType == CommandType.TeacherApproval) {
            dao.upsertQueueCommand(
                pending.copy(
                    status = QueueStatus.Done,
                    updatedAt = now,
                ),
            )
        }
        updateSnapshot { current ->
            current.copy(
                waitingTeacher = false,
                classPhase = RobotPhase.Execution,
                bannerState = BannerState.Running,
                robotStatusLabel = esOrEn(current.languageCode, "Temi va a comenzar", "Temi is about to start"),
                currentStepLabel = esOrEn(current.languageCode, "Preparando recorrido", "Preparing route"),
                currentActionHint =
                    esOrEn(
                        current.languageCode,
                        "Primero saludare y luego visitare los tres lugares del taller.",
                        "I will greet first and then visit the three workshop stops.",
                    ),
                progressPercent = progress,
                lastUpdatedAt = now,
            )
        }
    }

    suspend fun pauseMission(reason: String? = null) {
        updateSnapshot { current ->
            current.copy(
                classPhase = RobotPhase.ClassInProgress,
                bannerState = BannerState.Paused,
                robotStatusLabel = reason ?: esOrEn(current.languageCode, "Mision en pausa", "Mission paused"),
                currentStepLabel = esOrEn(current.languageCode, "Esperando reanudacion", "Waiting to resume"),
                currentActionHint =
                    esOrEn(
                        current.languageCode,
                        "Temi quedo en pausa. El docente puede reanudar cuando el grupo este listo.",
                        "Temi is paused until the teacher resumes the activity.",
                    ),
                lastUpdatedAt = now(),
            )
        }
    }

    suspend fun activateCommand(command: QueueCommandEntity, statusLabel: String) {
        val now = now()
        dao.upsertQueueCommand(command.copy(status = QueueStatus.Running, updatedAt = now))
        updateSnapshot { current ->
            current.copy(
                classPhase = RobotPhase.Execution,
                bannerState = BannerState.Running,
                currentStepLabel = command.toKidStepLabel(current.languageCode),
                currentActionHint = command.toKidNarration(current.languageCode),
                robotStatusLabel = statusLabel,
                lastErrorTitle = null,
                lastErrorMessage = null,
                studentCanResolve = false,
                autoRetryPlanned = false,
                promptTitle = null,
                promptBody = null,
                promptOptions = null,
                promptExpectedAnswer = null,
                promptCountdownSeconds = null,
                lastUpdatedAt = now,
            )
        }
    }

    suspend fun markInteraction(command: QueueCommandEntity) {
        val now = now()
        dao.upsertQueueCommand(command.copy(status = QueueStatus.WaitingInput, updatedAt = now))
        updateSnapshot { current ->
            current.copy(
                classPhase = RobotPhase.Interaction,
                bannerState = BannerState.Paused,
                robotStatusLabel = esOrEn(current.languageCode, "Temi espera tu toque", "Temi is waiting for your touch"),
                currentStepLabel = esOrEn(current.languageCode, "Listos para empezar", "Ready to begin"),
                currentActionHint = command.secondaryValue ?: command.primaryValue,
                promptTitle = command.primaryValue,
                promptBody = command.secondaryValue,
                promptOptions = command.optionsCsv,
                promptExpectedAnswer = command.tertiaryValue,
                promptCountdownSeconds = 20,
                allowVoice = true,
                allowButtons = true,
                allowTouch = true,
                lastUpdatedAt = now,
            )
        }
    }

    suspend fun resolveInteraction(choice: String) {
        val waiting = dao.getWaitingPromptCommand() ?: return
        val now = now()
        val progress = progressPercent()
        dao.upsertQueueCommand(
            waiting.copy(
                status = QueueStatus.Done,
                secondaryValue = choice,
                updatedAt = now,
            ),
        )
        updateSnapshot { current ->
            current.copy(
                classPhase = RobotPhase.Execution,
                bannerState = BannerState.Running,
                robotStatusLabel = esOrEn(current.languageCode, "Muy bien, continuemos", "Great, let's continue"),
                currentActionHint =
                    esOrEn(
                        current.languageCode,
                        "Temi recibio la respuesta del equipo y seguira con el recorrido.",
                        "Temi received the answer and will continue the route.",
                    ),
                promptTitle = null,
                promptBody = null,
                promptOptions = null,
                promptExpectedAnswer = null,
                promptCountdownSeconds = null,
                progressPercent = progress,
                lastUpdatedAt = now,
            )
        }
    }

    suspend fun completeCommand(commandId: Long) {
        val command = dao.getQueueCommand(commandId) ?: return
        val now = now()
        val progress = progressPercent()
        dao.upsertQueueCommand(command.copy(status = QueueStatus.Done, updatedAt = now))
        updateSnapshot { current ->
            current.copy(
                progressPercent = progress,
                lastUpdatedAt = now,
            )
        }
    }

    suspend fun showRecoverableError(
        title: String,
        message: String,
        studentCanResolve: Boolean,
        autoRetryPlanned: Boolean,
        commandId: Long? = null,
    ) {
        val now = now()
        val command = commandId?.let { dao.getQueueCommand(it) }
        if (command != null) {
            dao.upsertQueueCommand(
                command.copy(
                    status = if (command.commandType == CommandType.WaitForChoice && studentCanResolve) QueueStatus.WaitingInput else QueueStatus.Blocked,
                    retryCount = command.retryCount + 1,
                    blockingReason = message,
                    updatedAt = now,
                ),
            )
        }
        updateSnapshot { current ->
            current.copy(
                classPhase = RobotPhase.Error,
                bannerState = BannerState.Paused,
                robotStatusLabel = title,
                currentActionHint = message,
                lastErrorTitle = title,
                lastErrorMessage = message,
                studentCanResolve = studentCanResolve,
                autoRetryPlanned = autoRetryPlanned,
                lastUpdatedAt = now,
            )
        }
    }

    suspend fun restoreFromError(): Boolean {
        val waitingPrompt = dao.getWaitingPromptCommand()
        if (waitingPrompt != null) {
            markInteraction(waitingPrompt)
            return true
        }
        dao.getQueue().firstOrNull { it.status == QueueStatus.Blocked }?.let { blocked ->
            dao.upsertQueueCommand(
                blocked.copy(
                    status = QueueStatus.Pending,
                    blockingReason = null,
                    updatedAt = now(),
                ),
            )
        }
        updateSnapshot { current ->
            current.copy(
                classPhase = RobotPhase.Execution,
                bannerState = BannerState.Running,
                lastErrorTitle = null,
                lastErrorMessage = null,
                studentCanResolve = false,
                autoRetryPlanned = false,
                currentActionHint =
                    esOrEn(
                        current.languageCode,
                        "Temi intentara continuar con cuidado.",
                        "Temi will try to continue carefully.",
                    ),
                lastUpdatedAt = now(),
            )
        }
        return false
    }

    suspend fun enterSafeMode(violation: SafetyViolation) {
        val now = now()
        dao.upsertIncident(
            SafetyIncidentEntity(
                code = violation.code,
                title = violation.title,
                details = violation.details,
                severity = violation.severity,
                status = IncidentStatus.Open,
                teacherActionRequired = true,
                createdAt = now,
                updatedAt = now,
            ),
        )
        updateSnapshot { current ->
            current.copy(
                classPhase = RobotPhase.SafeMode,
                bannerState = BannerState.SafeMode,
                robotStatusLabel = violation.title,
                currentActionHint = violation.details,
                safeModeActive = true,
                safeModeReason = violation.details,
                lastUpdatedAt = now,
            )
        }
    }

    suspend fun releaseSafeMode() {
        dao.resolveOpenIncidents(now())
        updateSnapshot { current ->
            current.copy(
                classPhase = if (current.activeMissionId == null) RobotPhase.Standby else RobotPhase.ClassInProgress,
                bannerState = if (current.activeMissionId == null) BannerState.Ready else BannerState.Paused,
                robotStatusLabel = esOrEn(current.languageCode, "Modo seguro liberado", "Safe mode released"),
                currentActionHint = esOrEn(current.languageCode, "El robot vuelve a esperar la orden del docente.", "The robot is waiting again for the teacher."),
                safeModeActive = false,
                safeModeReason = null,
                waitingTeacher = current.activeMissionId != null,
                lastUpdatedAt = now(),
            )
        }
    }

    suspend fun finishMission() {
        updateSnapshot { current ->
            current.copy(
                classPhase = RobotPhase.ClassInProgress,
                bannerState = BannerState.Ready,
                robotStatusLabel = esOrEn(current.languageCode, "Recorrido terminado", "Route complete"),
                currentStepLabel = esOrEn(current.languageCode, "Listo para el siguiente equipo", "Ready for the next team"),
                currentActionHint =
                    esOrEn(
                        current.languageCode,
                        "Lo lograron. Temi ya termino este recorrido y puede recibir al siguiente equipo.",
                        "Great job. Temi finished this route and is ready for the next team.",
                    ),
                progressPercent = 100,
                waitingTeacher = false,
                promptTitle = null,
                promptBody = null,
                promptOptions = null,
                promptExpectedAnswer = null,
                promptCountdownSeconds = null,
                lastUpdatedAt = now(),
            )
        }
    }

    suspend fun requestTeacherHelp() {
        val now = now()
        dao.upsertIncident(
            SafetyIncidentEntity(
                code = "TEACHER_HELP",
                title = "Ayuda del docente solicitada",
                details = "El robot dejo registrada una solicitud de apoyo manual.",
                severity = IncidentSeverity.Warning,
                status = IncidentStatus.Open,
                teacherActionRequired = true,
                createdAt = now,
                updatedAt = now,
            ),
        )
        updateSnapshot { current ->
            current.copy(
                robotStatusLabel = esOrEn(current.languageCode, "Ayuda solicitada", "Help requested"),
                currentActionHint =
                    esOrEn(
                        current.languageCode,
                        "Temi aviso al docente para revisar el siguiente paso.",
                        "Temi notified the teacher to review the next step.",
                    ),
                lastUpdatedAt = now,
            )
        }
    }

    suspend fun updateSyncState(
        apiBaseUrl: String? = null,
        pairingStatusLabel: String? = null,
        syncStatusLabel: String? = null,
        pairCode: String? = null,
        sessionUri: String? = null,
        assignedRobotName: String? = null,
        classroomName: String? = null,
    ) {
        updateSnapshot { current ->
            current.copy(
                apiBaseUrl = apiBaseUrl ?: current.apiBaseUrl,
                pairingStatusLabel = pairingStatusLabel ?: current.pairingStatusLabel,
                syncStatusLabel = syncStatusLabel ?: current.syncStatusLabel,
                pairCode = pairCode ?: current.pairCode,
                sessionUri = sessionUri ?: current.sessionUri,
                assignedRobotName = assignedRobotName ?: current.assignedRobotName,
                classroomName = classroomName ?: current.classroomName,
                lastUpdatedAt = now(),
            )
        }
    }

    suspend fun toggleLanguage() {
        updateSnapshot { current ->
            val next = if (current.languageCode == "es") "en" else "es"
            current.copy(
                languageCode = next,
                robotStatusLabel = current.robotStatusLabel.translate(next),
                currentActionHint = current.currentActionHint,
                lastUpdatedAt = now(),
            )
        }
    }

    suspend fun currentSnapshot(): RobotSnapshotEntity = dao.getSnapshot() ?: defaultSnapshot()

    suspend fun currentQueue(): List<QueueCommandEntity> = dao.getQueue()

    suspend fun currentLocations(): List<MapLocationEntity> = dao.getLocations()

    suspend fun getNextPendingCommand(): QueueCommandEntity? = dao.getNextPendingCommand()

    suspend fun getWaitingPromptCommand(): QueueCommandEntity? = dao.getWaitingPromptCommand()

    suspend fun runMapDiagnostic() {
        val diagnostics = refreshDiagnostics()
        if (!diagnostics.mapReady) {
            showRecoverableError(
                title = "No encuentro el mapa",
                message = "Verifica el mapa del robot y vuelve a intentar el diagnostico.",
                studentCanResolve = false,
                autoRetryPlanned = false,
            )
        }
    }

    suspend fun clearQueueAndStandby() {
        dao.clearQueue()
        dao.clearIncidents()
        updateSnapshot { current ->
            defaultSnapshot().copy(
                assignedRobotName = current.assignedRobotName,
                classroomName = current.classroomName,
                teacherName = current.teacherName,
                languageCode = current.languageCode,
                connectionState = current.connectionState,
                batteryPercent = current.batteryPercent,
                batteryCharging = current.batteryCharging,
                apiBaseUrl = current.apiBaseUrl,
                pairingStatusLabel = current.pairingStatusLabel,
                syncStatusLabel = current.syncStatusLabel,
                pairCode = current.pairCode,
                sessionUri = current.sessionUri,
            )
        }
    }

    private suspend fun updateSnapshot(transform: (RobotSnapshotEntity) -> RobotSnapshotEntity) {
        lock.withLock {
            val current = dao.getSnapshot() ?: defaultSnapshot()
            dao.upsertSnapshot(transform(current))
        }
    }

    private fun defaultSnapshot(): RobotSnapshotEntity {
        val now = now()
        return RobotSnapshotEntity(
            institutionName = "Esbot EduLab",
            assignedRobotName = "Temi V3 Aula 5A",
            classroomName = "Curso 5A",
            teacherName = "Mariana Torres",
            nextTurnName = "Equipo verde",
            activeMissionId = null,
            activeMissionName = null,
            activeStudentName = null,
            currentStepLabel = null,
            currentActionHint = "Temi esta listo para recibir a la clase.",
            classPhase = RobotPhase.Standby,
            bannerState = BannerState.Ready,
            connectionState = "CHECKING",
            batteryPercent = 82,
            batteryCharging = false,
            progressPercent = 0,
            robotStatusLabel = "Listo para iniciar clase",
            apiBaseUrl = "",
            pairingStatusLabel = "Sin vinculacion",
            syncStatusLabel = "Configura la URL del backend",
            languageCode = "es",
            pairCode = "Sin codigo",
            sessionUri = "edulab://robot/pending",
            waitingTeacher = false,
            safeModeActive = false,
            safeModeReason = null,
            lastErrorTitle = null,
            lastErrorMessage = null,
            studentCanResolve = false,
            autoRetryPlanned = false,
            promptTitle = null,
            promptBody = null,
            promptOptions = null,
            promptExpectedAnswer = null,
            promptCountdownSeconds = null,
            studentModeLabel = "Modo avanzado",
            deviceModeLabel = "Un dispositivo por equipo",
            executionModeLabel = "Modo real",
            baseLocationName = "Punto base",
            routePreviewCsv = "Biblioteca|Salon 5A|Laboratorio",
            allowVoice = true,
            allowButtons = true,
            allowTouch = true,
            lastUpdatedAt = now,
        )
    }

    private fun defaultLocations(): List<MapLocationEntity> {
        val now = now()
        return listOf(
            MapLocationEntity(
                name = "Biblioteca",
                floorLabel = "Piso principal",
                available = true,
                detail = "Ruta lista",
                lastValidatedAt = now,
            ),
            MapLocationEntity(
                name = "Salon 5A",
                floorLabel = "Piso principal",
                available = true,
                detail = "Parada central del taller",
                lastValidatedAt = now,
            ),
            MapLocationEntity(
                name = "Laboratorio",
                floorLabel = "Piso principal",
                available = true,
                detail = "Punto alterno",
                lastValidatedAt = now,
            ),
            MapLocationEntity(
                name = "Punto base",
                floorLabel = "Piso principal",
                available = true,
                detail = "Regreso del robot",
                lastValidatedAt = now,
            ),
        )
    }

    private suspend fun progressPercent(): Int {
        val queue = dao.getQueue()
        val actionable = queue.count { it.commandType != CommandType.TeacherApproval }
        val completed =
            queue.count {
                it.commandType != CommandType.TeacherApproval && it.status == QueueStatus.Done
            }
        return if (actionable == 0) 0 else (completed * 100) / actionable
    }

    private fun now(): Long = System.currentTimeMillis()

    private fun mergeLocations(
        defaults: List<MapLocationEntity>,
        diagnostics: List<MapLocationEntity>,
    ): List<MapLocationEntity> {
        val byKey = linkedMapOf<String, MapLocationEntity>()
        defaults.forEach { byKey[it.name.normalizedLocationKey()] = it }
        diagnostics.forEach { byKey[it.name.normalizedLocationKey()] = it }
        return byKey.values.sortedBy { it.name.lowercase() }
    }
}

private fun String.humanize(languageCode: String): String {
    return when (this) {
        "READY" -> if (languageCode == "es") "Listo" else "Ready"
        "MOVING" -> if (languageCode == "es") "Temi va en camino" else "Temi is moving"
        "DISCONNECTED" -> if (languageCode == "es") "Sin conexion" else "Offline"
        else -> if (languageCode == "es") "Operativo" else "Operational"
    }
}

private fun String.translate(languageCode: String): String {
    return when (this) {
        "Listo para iniciar clase" -> if (languageCode == "es") this else "Ready to start class"
        "Ready to start class" -> if (languageCode == "en") this else "Listo para iniciar clase"
        else -> this
    }
}

private fun esOrEn(languageCode: String, es: String, en: String): String {
    return if (languageCode == "es") es else en
}

private fun QueueCommandEntity.toKidStepLabel(languageCode: String): String {
    return when (commandType) {
        CommandType.Speak -> primaryValue ?: title
        CommandType.Navigate -> {
            val target = secondaryValue ?: primaryValue ?: title
            if (languageCode == "es") "Voy a $target" else "I am going to $target"
        }
        CommandType.WaitForChoice -> if (languageCode == "es") "Te toca al equipo" else "Your team turn"
        CommandType.Detect -> if (languageCode == "es") "Estoy revisando el lugar" else "Checking the space"
        CommandType.Complete -> if (languageCode == "es") "Recorrido terminado" else "Route complete"
        else -> title
    }
}

private fun QueueCommandEntity.toKidNarration(languageCode: String): String {
    return when (commandType) {
        CommandType.Speak -> primaryValue ?: title
        CommandType.Navigate -> {
            val target = secondaryValue ?: primaryValue ?: title
            if (languageCode == "es") "Temi esta yendo a $target. Deja libre el camino para moverse con seguridad." else "Temi is moving to $target. Please keep the path clear."
        }
        CommandType.WaitForChoice -> secondaryValue ?: primaryValue ?: title
        CommandType.Detect -> if (languageCode == "es") "Temi esta revisando el entorno antes de seguir." else "Temi is checking the environment before continuing."
        CommandType.Complete -> if (languageCode == "es") "Temi termino el recorrido y quedo listo para el siguiente equipo." else "Temi finished the route and is ready for the next team."
        else -> title
    }
}

private fun String?.ifBlankOrNull(fallback: () -> String): String {
    return if (this.isNullOrBlank()) fallback() else this
}

private fun String.normalizedLocationKey(): String {
    return trim().lowercase()
}
