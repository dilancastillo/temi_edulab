package com.esbot.edulab.robot.runtime

import com.esbot.edulab.robot.data.local.MapLocationEntity
import com.esbot.edulab.robot.data.local.QueueCommandEntity
import com.esbot.edulab.robot.model.CommandType
import com.esbot.edulab.robot.model.QueueStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SafetyInspectorTest {
    @Test
    fun `detects invalid location`() {
        val violations =
            SafetyInspector.inspect(
                queue = listOf(navigateCommand(index = 0, target = "Biblioteca fantasma")),
                locations = listOf(location("Biblioteca")),
                mapReady = true,
            )

        assertTrue(violations.any { it.code == "INVALID_LOCATION" })
    }

    @Test
    fun `detects duplicated navigation`() {
        val violations =
            SafetyInspector.inspect(
                queue =
                    listOf(
                        navigateCommand(index = 0, target = "Biblioteca"),
                        navigateCommand(index = 1, target = "Biblioteca"),
                        navigateCommand(index = 2, target = "Biblioteca"),
                    ),
                locations = listOf(location("Biblioteca")),
                mapReady = true,
            )

        assertTrue(violations.any { it.code == "DUPLICATE_NAVIGATION" })
    }

    @Test
    fun `detects repeated classroom stop before returning to base`() {
        val violations =
            SafetyInspector.inspect(
                queue =
                    listOf(
                        navigateCommand(index = 0, target = "Biblioteca", title = "Ir al lugar 1"),
                        navigateCommand(index = 1, target = "Salon 5A", title = "Ir al lugar 2"),
                        navigateCommand(index = 2, target = "Biblioteca", title = "Ir al lugar 3"),
                        navigateCommand(index = 3, target = "Punto base", title = "Volver al punto base"),
                    ),
                locations =
                    listOf(
                        location("Biblioteca"),
                        location("Salon 5A"),
                        location("Punto base"),
                    ),
                mapReady = true,
            )

        assertTrue(violations.any { it.code == "REPEATED_STOP" })
    }

    @Test
    fun `accepts locations with different casing`() {
        val violations =
            SafetyInspector.inspect(
                queue = listOf(navigateCommand(index = 0, target = "Biblioteca")),
                locations = listOf(location("biblioteca")),
                mapReady = true,
            )

        assertTrue(violations.none { it.code == "INVALID_LOCATION" })
    }

    @Test
    fun `detects missing map for navigation`() {
        val violations =
            SafetyInspector.inspect(
                queue = listOf(navigateCommand(index = 0, target = "Biblioteca")),
                locations = listOf(location("Biblioteca")),
                mapReady = false,
            )

        assertEquals("MAP_NOT_READY", violations.first().code)
    }

    private fun navigateCommand(index: Int, target: String, title: String = "Ir a $target"): QueueCommandEntity {
        return QueueCommandEntity(
            missionId = "mission",
            commandIndex = index,
            commandType = CommandType.Navigate,
            title = title,
            primaryValue = target,
            secondaryValue = null,
            tertiaryValue = null,
            optionsCsv = null,
            status = QueueStatus.Pending,
            requiresTeacherApproval = false,
            retryCount = 0,
            blockingReason = null,
            createdAt = 0L,
            updatedAt = 0L,
        )
    }

    private fun location(name: String): MapLocationEntity {
        return MapLocationEntity(
            name = name,
            floorLabel = "Piso principal",
            available = true,
            detail = null,
            lastValidatedAt = 0L,
        )
    }
}
