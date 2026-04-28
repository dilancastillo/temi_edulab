package com.esbot.edulab.core.robot

sealed class RobotCommand {
    data class Navigate(val location: String) : RobotCommand()
    data class Say(val text: String) : RobotCommand()
    data class ShowImage(val imageUrl: String, val durationMs: Long = 7000L) : RobotCommand()
    data class ShowVideo(val videoUrl: String) : RobotCommand()
    data class AskCondition(
        val question: String,
        val options: List<ConditionOption>
    ) : RobotCommand()
    data class Repeat(val times: Int, val commands: List<RobotCommand>) : RobotCommand()
    data class WhileCount(val limit: Int, val commands: List<RobotCommand>) : RobotCommand()
    data class WhileTimer(val seconds: Int, val commands: List<RobotCommand>) : RobotCommand()
    data class WhileListen(
        val stopWord: String,
        val maxIterations: Int,
        val commands: List<RobotCommand>
    ) : RobotCommand()
}

data class ConditionOption(
    val keyword: String,
    val action: RobotCommand
)

interface RobotCommandRunner {
    fun run(command: RobotCommand): Result<Unit>
    fun runSequence(commands: List<RobotCommand>): Result<Unit>
}
