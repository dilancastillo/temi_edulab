package com.esbot.edulab.robot.runtime

import com.esbot.edulab.robot.data.local.QueueCommandEntity
import com.esbot.edulab.robot.model.CommandType
import com.esbot.edulab.robot.model.MissionDefinition
import com.esbot.edulab.robot.model.MissionStepSpec
import com.esbot.edulab.robot.model.QueueStatus

object MissionCatalog {
    fun libraryMission(): MissionDefinition {
        return MissionDefinition(
            id = "library-guided-runtime",
            title = "Ruta guiada a biblioteca",
            classroom = "5A Ciencias",
            teacherName = "Mariana Torres",
            steps = listOf(
                MissionStepSpec(
                    type = CommandType.TeacherApproval,
                    title = "Esperar aprobacion del docente",
                    requiresTeacherApproval = true,
                ),
                MissionStepSpec(
                    type = CommandType.Speak,
                    title = "Presentacion",
                    primaryValue = "Hola equipo. Soy Temi EduLab y voy a guiarlos a la biblioteca.",
                ),
                MissionStepSpec(
                    type = CommandType.Navigate,
                    title = "Ir a biblioteca",
                    primaryValue = "Biblioteca",
                ),
                MissionStepSpec(
                    type = CommandType.Speak,
                    title = "Explicacion de llegada",
                    primaryValue = "Ya estoy en la biblioteca. Ahora necesito una decision del equipo.",
                ),
                MissionStepSpec(
                    type = CommandType.WaitForChoice,
                    title = "Pregunta al estudiante",
                    primaryValue = "Que debo hacer ahora?",
                    secondaryValue = "Selecciona la accion que corresponde a la mision.",
                    tertiaryValue = "Buscar libro verde",
                    options = listOf("Saludar", "Buscar libro verde", "Volver al salon"),
                ),
                MissionStepSpec(
                    type = CommandType.Detect,
                    title = "Detectar marcador",
                    primaryValue = "Marcador verde",
                    secondaryValue = "Zona biblioteca",
                ),
                MissionStepSpec(
                    type = CommandType.Speak,
                    title = "Cierre y revision",
                    primaryValue = "Mision lista. Necesito que el docente revise este programa antes de continuar.",
                ),
                MissionStepSpec(
                    type = CommandType.Complete,
                    title = "Completar mision",
                ),
            ),
        )
    }

    fun MissionDefinition.toQueueEntities(now: Long = System.currentTimeMillis()): List<QueueCommandEntity> {
        return steps.mapIndexed { index, step ->
            QueueCommandEntity(
                missionId = id,
                commandIndex = index,
                commandType = step.type,
                title = step.title,
                primaryValue = step.primaryValue,
                secondaryValue = step.secondaryValue,
                tertiaryValue = step.tertiaryValue,
                optionsCsv = step.options.joinToString("|").ifBlank { null },
                status = QueueStatus.Pending,
                requiresTeacherApproval = step.requiresTeacherApproval,
                retryCount = 0,
                blockingReason = null,
                createdAt = now,
                updatedAt = now,
            )
        }
    }
}
