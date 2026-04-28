package com.esbot.edulab.robot.model

object RobotPhase {
    const val Standby = "STANDBY"
    const val ClassInProgress = "CLASS_IN_PROGRESS"
    const val Execution = "EXECUTION"
    const val Interaction = "INTERACTION"
    const val Error = "ERROR"
    const val SafeMode = "SAFE_MODE"
}

object BannerState {
    const val Ready = "READY"
    const val Offline = "OFFLINE"
    const val Paused = "PAUSED"
    const val Running = "RUNNING"
    const val SafeMode = "SAFE_MODE"
}

object CommandType {
    const val TeacherApproval = "TEACHER_APPROVAL"
    const val Speak = "SPEAK"
    const val Navigate = "NAVIGATE"
    const val WaitForChoice = "WAIT_FOR_CHOICE"
    const val Detect = "DETECT"
    const val Complete = "COMPLETE"
}

object QueueStatus {
    const val Pending = "PENDING"
    const val Running = "RUNNING"
    const val WaitingInput = "WAITING_INPUT"
    const val Done = "DONE"
    const val Failed = "FAILED"
    const val Blocked = "BLOCKED"
}

object IncidentStatus {
    const val Open = "OPEN"
    const val Resolved = "RESOLVED"
}

object IncidentSeverity {
    const val Warning = "WARNING"
    const val Critical = "CRITICAL"
}

data class MissionDefinition(
    val id: String,
    val title: String,
    val classroom: String,
    val teacherName: String,
    val studentModeLabel: String,
    val deviceModeLabel: String,
    val executionModeLabel: String,
    val baseLocationName: String,
    val routeStops: List<MissionRouteStop>,
    val turnQueue: List<String>,
    val welcomeLine: String,
    val celebrationLine: String,
    val steps: List<MissionStepSpec>,
)

data class MissionRouteStop(
    val locationName: String,
    val alias: String,
    val iconToken: String,
    val explanation: String,
)

data class MissionStepSpec(
    val type: String,
    val title: String,
    val primaryValue: String? = null,
    val secondaryValue: String? = null,
    val tertiaryValue: String? = null,
    val options: List<String> = emptyList(),
    val requiresTeacherApproval: Boolean = false,
)

data class RobotLocationDiagnostic(
    val name: String,
    val available: Boolean,
    val detail: String? = null,
)

data class RobotDiagnostics(
    val ready: Boolean,
    val connectionState: String,
    val batteryPercent: Int,
    val isCharging: Boolean,
    val mapReady: Boolean,
    val locations: List<RobotLocationDiagnostic>,
    val rawStatus: String,
)

data class RobotCommandResult(
    val success: Boolean,
    val message: String? = null,
)

data class SafetyViolation(
    val code: String,
    val title: String,
    val details: String,
    val severity: String = IncidentSeverity.Critical,
)
