package com.esbot.edulab.robot.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val RobotColorScheme =
    darkColorScheme(
        primary = RobotPrimary,
        secondary = RobotAccent,
        tertiary = RobotReady,
        background = RobotBackground,
        surface = RobotSurface,
        surfaceVariant = RobotSurfaceAlt,
        onPrimary = RobotText,
        onSecondary = RobotText,
        onBackground = RobotText,
        onSurface = RobotText,
    )

@Composable
fun RobotTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = RobotColorScheme,
        content = content,
    )
}
