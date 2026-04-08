package com.esbot.edulab.robot.runtime

import com.esbot.edulab.robot.model.RobotCommandResult
import com.esbot.edulab.robot.model.RobotDiagnostics

interface RobotBridge {
    suspend fun fetchDiagnostics(): RobotDiagnostics

    suspend fun hideTopBar(hidden: Boolean): RobotCommandResult

    suspend fun speak(text: String, languageCode: String): RobotCommandResult

    suspend fun goTo(locationName: String): RobotCommandResult

    suspend fun stopMovement(): RobotCommandResult
}
