package com.esbot.edulab.robot.runtime

import com.esbot.edulab.robot.model.RobotCommandResult
import com.esbot.edulab.robot.model.RobotDiagnostics
import com.esbot.edulab.robot.model.RobotLocationDiagnostic
import kotlinx.coroutines.delay

class MockRobotBridge : RobotBridge {
    private var batteryPercent = 82
    private var moving = false

    override suspend fun fetchDiagnostics(): RobotDiagnostics {
        if (moving) {
            batteryPercent = (batteryPercent - 1).coerceAtLeast(40)
        }
        return RobotDiagnostics(
            ready = true,
            connectionState = "CONNECTED",
            batteryPercent = batteryPercent,
            isCharging = false,
            mapReady = true,
            locations = listOf(
                RobotLocationDiagnostic(name = "Biblioteca", available = true, detail = "Ruta validada"),
                RobotLocationDiagnostic(name = "Salon 5A", available = true, detail = "Parada central"),
                RobotLocationDiagnostic(name = "Laboratorio", available = true, detail = "Punto alterno"),
                RobotLocationDiagnostic(name = "Punto base", available = true, detail = "Regreso del robot"),
            ),
            rawStatus = if (moving) "MOVING" else "READY",
        )
    }

    override suspend fun hideTopBar(hidden: Boolean): RobotCommandResult {
        return RobotCommandResult(success = true, message = if (hidden) "Top bar oculta" else "Top bar visible")
    }

    override suspend fun speak(text: String, languageCode: String): RobotCommandResult {
        delay(800)
        return RobotCommandResult(success = true, message = "Mock TTS: $text")
    }

    override suspend fun goTo(locationName: String): RobotCommandResult {
        moving = true
        delay(1500)
        moving = false
        return RobotCommandResult(success = true, message = "Mock goto $locationName")
    }

    override suspend fun stopMovement(): RobotCommandResult {
        moving = false
        return RobotCommandResult(success = true, message = "Mock stop")
    }
}
