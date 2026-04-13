package com.esbot.edulab.core.robot

sealed class RobotCommand {
    data class Navigate(val location: String) : RobotCommand()
    data class Say(val text: String) : RobotCommand()
    data class ShowImage(val imageBase64: String, val durationMs: Long = 7000L) : RobotCommand()
}

interface RobotCommandRunner {
    fun run(command: RobotCommand): Result<Unit>
    fun runSequence(commands: List<RobotCommand>): Result<Unit>
}
