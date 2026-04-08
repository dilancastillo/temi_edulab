package com.esbot.edulab.robot.ui

import com.esbot.edulab.robot.data.local.MapLocationEntity
import com.esbot.edulab.robot.data.local.QueueCommandEntity
import com.esbot.edulab.robot.data.local.RobotSnapshotEntity
import com.esbot.edulab.robot.data.local.SafetyIncidentEntity
import com.esbot.edulab.robot.data.repository.RobotStore
import com.esbot.edulab.robot.model.BannerState
import com.esbot.edulab.robot.model.QueueStatus
import com.esbot.edulab.robot.model.RobotPhase

enum class RobotSurface {
    Standby,
    ClassInProgress,
    Execution,
    Interaction,
    Error,
    SafeMode,
}

enum class BannerTone {
    Ready,
    Warning,
    Critical,
    Active,
}

data class RobotPromptUi(
    val title: String,
    val body: String?,
    val options: List<String>,
    val countdownSeconds: Int?,
    val allowVoice: Boolean,
    val allowButtons: Boolean,
    val allowTouch: Boolean,
)

data class RobotLocationUi(
    val name: String,
    val detail: String?,
    val available: Boolean,
)

data class RobotIncidentUi(
    val title: String,
    val details: String,
    val severity: String,
)

data class RobotUiState(
    val institutionName: String,
    val assignedRobotName: String,
    val classroomName: String,
    val teacherName: String,
    val activeMissionName: String?,
    val activeStudentName: String?,
    val currentStepLabel: String?,
    val surface: RobotSurface,
    val bannerLabel: String,
    val bannerTone: BannerTone,
    val connectionState: String,
    val batteryPercent: Int,
    val batteryCharging: Boolean,
    val progressPercent: Int,
    val robotStatusLabel: String,
    val languageCode: String,
    val pairCode: String,
    val sessionUri: String,
    val waitingTeacher: Boolean,
    val safeModeActive: Boolean,
    val safeModeReason: String?,
    val lastErrorTitle: String?,
    val lastErrorMessage: String?,
    val studentCanResolve: Boolean,
    val autoRetryPlanned: Boolean,
    val prompt: RobotPromptUi?,
    val locations: List<RobotLocationUi>,
    val incidents: List<RobotIncidentUi>,
    val queuePreview: List<String>,
) {
    companion object {
        fun preview(): RobotUiState {
            return fromStore(
                RobotStore(
                    snapshot =
                        RobotSnapshotEntity(
                            institutionName = "Esbot EduLab",
                            assignedRobotName = "Temi V3 Aula 5A",
                            classroomName = "5A Ciencias",
                            teacherName = "Mariana Torres",
                            activeMissionId = null,
                            activeMissionName = null,
                            activeStudentName = null,
                            currentStepLabel = null,
                            classPhase = RobotPhase.Standby,
                            bannerState = BannerState.Ready,
                            connectionState = "CONNECTED",
                            batteryPercent = 84,
                            batteryCharging = false,
                            progressPercent = 0,
                            robotStatusLabel = "Listo para iniciar clase",
                            languageCode = "es",
                            pairCode = "EDU-5A-2047",
                            sessionUri = "edulab://robot/EDU-5A-2047",
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
                            allowVoice = true,
                            allowButtons = true,
                            allowTouch = true,
                            lastUpdatedAt = 0L,
                        ),
                    queue = emptyList(),
                    locations = emptyList(),
                    incidents = emptyList(),
                ),
            )
        }

        fun fromStore(store: RobotStore): RobotUiState {
            val snapshot = store.snapshot
            return RobotUiState(
                institutionName = snapshot.institutionName,
                assignedRobotName = snapshot.assignedRobotName,
                classroomName = snapshot.classroomName,
                teacherName = snapshot.teacherName,
                activeMissionName = snapshot.activeMissionName,
                activeStudentName = snapshot.activeStudentName,
                currentStepLabel = snapshot.currentStepLabel,
                surface = snapshot.classPhase.toSurface(),
                bannerLabel = snapshot.bannerState.toBannerLabel(snapshot.languageCode),
                bannerTone = snapshot.bannerState.toBannerTone(),
                connectionState = snapshot.connectionState,
                batteryPercent = snapshot.batteryPercent,
                batteryCharging = snapshot.batteryCharging,
                progressPercent = snapshot.progressPercent,
                robotStatusLabel = snapshot.robotStatusLabel,
                languageCode = snapshot.languageCode,
                pairCode = snapshot.pairCode,
                sessionUri = snapshot.sessionUri,
                waitingTeacher = snapshot.waitingTeacher,
                safeModeActive = snapshot.safeModeActive,
                safeModeReason = snapshot.safeModeReason,
                lastErrorTitle = snapshot.lastErrorTitle,
                lastErrorMessage = snapshot.lastErrorMessage,
                studentCanResolve = snapshot.studentCanResolve,
                autoRetryPlanned = snapshot.autoRetryPlanned,
                prompt = snapshot.toPrompt(),
                locations = store.locations.map(MapLocationEntity::toUi),
                incidents = store.incidents.map(SafetyIncidentEntity::toUi),
                queuePreview = store.queue.filter { it.status != QueueStatus.Done }.map(QueueCommandEntity::title),
            )
        }
    }
}

private fun RobotSnapshotEntity.toPrompt(): RobotPromptUi? {
    val title = promptTitle ?: return null
    return RobotPromptUi(
        title = title,
        body = promptBody,
        options = promptOptions?.split("|").orEmpty().filter { it.isNotBlank() },
        countdownSeconds = promptCountdownSeconds,
        allowVoice = allowVoice,
        allowButtons = allowButtons,
        allowTouch = allowTouch,
    )
}

private fun String.toSurface(): RobotSurface {
    return when (this) {
        RobotPhase.ClassInProgress -> RobotSurface.ClassInProgress
        RobotPhase.Execution -> RobotSurface.Execution
        RobotPhase.Interaction -> RobotSurface.Interaction
        RobotPhase.Error -> RobotSurface.Error
        RobotPhase.SafeMode -> RobotSurface.SafeMode
        else -> RobotSurface.Standby
    }
}

private fun String.toBannerLabel(languageCode: String): String {
    return when (this) {
        BannerState.Ready -> if (languageCode == "es") "Listo" else "Ready"
        BannerState.Offline -> if (languageCode == "es") "Sin conexion" else "Offline"
        BannerState.Paused -> if (languageCode == "es") "En pausa" else "Paused"
        BannerState.Running -> if (languageCode == "es") "En mision" else "In mission"
        BannerState.SafeMode -> if (languageCode == "es") "Modo seguro" else "Safe mode"
        else -> this
    }
}

private fun String.toBannerTone(): BannerTone {
    return when (this) {
        BannerState.Ready -> BannerTone.Ready
        BannerState.Running -> BannerTone.Active
        BannerState.SafeMode -> BannerTone.Critical
        else -> BannerTone.Warning
    }
}

private fun MapLocationEntity.toUi(): RobotLocationUi {
    return RobotLocationUi(name = name, detail = detail, available = available)
}

private fun SafetyIncidentEntity.toUi(): RobotIncidentUi {
    return RobotIncidentUi(title = title, details = details, severity = severity)
}
