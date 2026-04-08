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

    private fun navigateCommand(index: Int, target: String): QueueCommandEntity {
        return QueueCommandEntity(
            missionId = "mission",
            commandIndex = index,
            commandType = CommandType.Navigate,
            title = "Ir a $target",
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
