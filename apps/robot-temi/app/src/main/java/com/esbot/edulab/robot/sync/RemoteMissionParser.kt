package com.esbot.edulab.robot.sync

import com.esbot.edulab.robot.model.CommandType
import com.esbot.edulab.robot.model.MissionDefinition
import com.esbot.edulab.robot.model.MissionRouteStop
import com.esbot.edulab.robot.model.MissionStepSpec
import org.json.JSONArray
import org.json.JSONObject

object RemoteMissionParser {
    fun parseClassroomGuide(
        runtime: JSONObject,
        activeStudentName: String?,
    ): MissionDefinition? {
        if (runtime.optString("type") != "classroom_guide") {
            return null
        }

        val routeStops = parseRouteStops(runtime.optJSONArray("checkpoints"))
        if (routeStops.size != 3) {
            return null
        }

        val steps = parseSteps(runtime.optJSONArray("steps"))
        if (steps.isEmpty()) {
            return null
        }

        val teacherName = runtime.optString("teacherName").ifBlank { "Docente" }
        val classroom = runtime.optString("classroom").ifBlank { runtime.optString("courseName").ifBlank { "Aula asignada" } }
        val studentMode = runtime.optString("studentMode")
        val deviceMode = runtime.optString("deviceMode")
        val executionMode = runtime.optString("executionMode")

        return MissionDefinition(
            id = runtime.optString("id").ifBlank { "remote-classroom-guide" },
            title = runtime.optString("missionTitle").ifBlank { "Temi guia mi salon" },
            classroom = classroom,
            teacherName = teacherName,
            studentModeLabel = studentMode.toStudentModeLabel(),
            deviceModeLabel = deviceMode.toDeviceModeLabel(),
            executionModeLabel = executionMode.toExecutionModeLabel(),
            baseLocationName = runtime.optString("baseLocationName").ifBlank { "Punto base" },
            routeStops = routeStops,
            turnQueue = listOfNotNull(activeStudentName).ifEmpty { listOf("Equipo del taller") },
            welcomeLine =
                runtime.optString("workshopName").ifBlank {
                    "Temi ya recibio el recorrido del taller."
                },
            celebrationLine = "Recorrido terminado. Temi puede recibir al siguiente turno.",
            steps = steps,
        )
    }

    private fun parseRouteStops(checkpoints: JSONArray?): List<MissionRouteStop> {
        if (checkpoints == null) return emptyList()
        return buildList {
            for (index in 0 until checkpoints.length()) {
                val checkpoint = checkpoints.optJSONObject(index) ?: continue
                val locationName = checkpoint.optString("locationName")
                val alias = checkpoint.optString("alias").ifBlank { locationName }
                val iconToken = checkpoint.optString("iconKey").ifBlank { "star" }
                val explanation = checkpoint.optString("messageText")
                if (locationName.isBlank() || explanation.isBlank()) {
                    continue
                }
                add(
                    MissionRouteStop(
                        locationName = locationName,
                        alias = alias,
                        iconToken = iconToken,
                        explanation = explanation,
                    ),
                )
            }
        }
    }

    private fun parseSteps(steps: JSONArray?): List<MissionStepSpec> {
        if (steps == null) return emptyList()
        return buildList {
            for (index in 0 until steps.length()) {
                val step = steps.optJSONObject(index) ?: continue
                val type = step.optString("type")
                val title = step.optString("title")
                if (type.isBlank() || title.isBlank()) {
                    continue
                }
                add(
                    MissionStepSpec(
                        type = type,
                        title = title,
                        primaryValue = step.optString("primaryValue").takeIf { it.isNotBlank() },
                        secondaryValue = step.optString("secondaryValue").takeIf { it.isNotBlank() },
                        tertiaryValue = step.optString("tertiaryValue").takeIf { it.isNotBlank() },
                        options = parseOptions(step.optJSONArray("options")),
                        requiresTeacherApproval = step.optBoolean("requiresTeacherApproval", type == CommandType.TeacherApproval),
                    ),
                )
            }
        }
    }

    private fun parseOptions(options: JSONArray?): List<String> {
        if (options == null) return emptyList()
        return buildList {
            for (index in 0 until options.length()) {
                val value = options.optString(index)
                if (value.isNotBlank()) {
                    add(value)
                }
            }
        }
    }
}

private fun String.toStudentModeLabel(): String {
    return when (this) {
        "advanced" -> "Modo avanzado"
        else -> "Modo guiado"
    }
}

private fun String.toDeviceModeLabel(): String {
    return when (this) {
        "teacher_demo" -> "Demostracion guiada"
        "student_device" -> "Un dispositivo por estudiante"
        else -> "Un dispositivo por equipo"
    }
}

private fun String.toExecutionModeLabel(): String {
    return when (this) {
        "demo_safe" -> "Demo segura"
        else -> "Modo real"
    }
}
