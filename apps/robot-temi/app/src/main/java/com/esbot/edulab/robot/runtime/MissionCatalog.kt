package com.esbot.edulab.robot.runtime

import com.esbot.edulab.robot.data.local.QueueCommandEntity
import com.esbot.edulab.robot.model.CommandType
import com.esbot.edulab.robot.model.MissionDefinition
import com.esbot.edulab.robot.model.MissionRouteStop
import com.esbot.edulab.robot.model.MissionStepSpec
import com.esbot.edulab.robot.model.QueueStatus

object MissionCatalog {
    fun classroomGuideMission(): MissionDefinition {
        val routeStops =
            listOf(
                MissionRouteStop(
                    locationName = "Biblioteca",
                    alias = "Biblioteca",
                    iconToken = "books",
                    explanation = "Esta es la biblioteca. Aqui leemos, buscamos ideas y compartimos historias.",
                ),
                MissionRouteStop(
                    locationName = "Salon 5A",
                    alias = "Salon 5A",
                    iconToken = "board",
                    explanation = "Este es nuestro salon. Aqui aprendemos juntos y presentamos nuestros trabajos.",
                ),
                MissionRouteStop(
                    locationName = "Laboratorio",
                    alias = "Laboratorio",
                    iconToken = "science",
                    explanation = "Este es el laboratorio. Aqui exploramos, probamos y descubrimos cosas nuevas.",
                ),
            )

        val greeting = "Hola visita. Soy Temi y hoy voy a guiar nuestro salon."
        val farewell = "Gracias por acompanarnos. Ahora voy a volver al punto base."

        val steps =
            buildList {
                add(
                    MissionStepSpec(
                        type = CommandType.TeacherApproval,
                        title = "Esperar aprobacion del docente",
                        requiresTeacherApproval = true,
                    ),
                )
                add(
                    MissionStepSpec(
                        type = CommandType.WaitForChoice,
                        title = "Listos para empezar",
                        primaryValue = "Toca el boton para empezar el recorrido.",
                        secondaryValue = "Cuando el equipo este listo, Temi comenzara la visita.",
                        tertiaryValue = "Empezar recorrido",
                        options = listOf("Empezar recorrido"),
                    ),
                )
                add(
                    MissionStepSpec(
                        type = CommandType.Speak,
                        title = "Saludo inicial",
                        primaryValue = greeting,
                    ),
                )
                routeStops.forEachIndexed { index, stop ->
                    add(
                        MissionStepSpec(
                            type = CommandType.Navigate,
                            title = "Ir al lugar ${index + 1}",
                            primaryValue = stop.locationName,
                            secondaryValue = stop.alias,
                            tertiaryValue = stop.iconToken,
                        ),
                    )
                    add(
                        MissionStepSpec(
                            type = CommandType.Speak,
                            title = "Explicar lugar ${index + 1}",
                            primaryValue = stop.explanation,
                            secondaryValue = stop.alias,
                            tertiaryValue = stop.iconToken,
                        ),
                    )
                }
                add(
                    MissionStepSpec(
                        type = CommandType.Speak,
                        title = "Despedida final",
                        primaryValue = farewell,
                    ),
                )
                add(
                    MissionStepSpec(
                        type = CommandType.Navigate,
                        title = "Volver al punto base",
                        primaryValue = "Punto base",
                        secondaryValue = "Punto base",
                        tertiaryValue = "home",
                    ),
                )
                add(
                    MissionStepSpec(
                        type = CommandType.Speak,
                        title = "Celebracion del turno",
                        primaryValue = "Lo lograron. Temi ya termino este recorrido y esta listo para el siguiente equipo.",
                    ),
                )
                add(
                    MissionStepSpec(
                        type = CommandType.Complete,
                        title = "Completar mision",
                    ),
                )
            }

        return MissionDefinition(
            id = "temi-guia-mi-salon",
            title = "Temi guia mi salon",
            classroom = "Curso 5A",
            teacherName = "Mariana Torres",
            studentModeLabel = "Modo avanzado",
            deviceModeLabel = "Un dispositivo por equipo",
            executionModeLabel = "Modo real",
            baseLocationName = "Punto base",
            routeStops = routeStops,
            turnQueue = listOf("Equipo azul", "Equipo verde", "Equipo sol"),
            welcomeLine = "Temi esta listo para guiar el salon con el equipo del turno.",
            celebrationLine = "Recorrido terminado. Temi puede volver a intentarlo con otro equipo.",
            steps = steps,
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
