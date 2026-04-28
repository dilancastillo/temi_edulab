package com.esbot.edulab.robot.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val RobotColorScheme =
    lightColorScheme(
        primary = RobotPrimary,
        secondary = RobotAccent,
        tertiary = RobotReady,
        background = RobotBackground,
        surface = RobotSurface,
        surfaceVariant = RobotSurfaceAlt,
        onPrimary = Color.White,
        onSecondary = Color.White,
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
