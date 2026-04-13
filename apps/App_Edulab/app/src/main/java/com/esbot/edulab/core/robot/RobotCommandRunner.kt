package com.esbot.edulab.core.robot

sealed class RobotCommand {
    data class Navigate(val location: String) : RobotCommand()
}

interface RobotCommandRunner {
    fun run(command: RobotCommand): Result<Unit>
}
