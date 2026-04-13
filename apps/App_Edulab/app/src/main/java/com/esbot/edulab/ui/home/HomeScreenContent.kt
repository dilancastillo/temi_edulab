package com.esbot.edulab.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.esbot.edulab.ui.components.EsbotTopBar

@Composable
fun HomeScreenContent(
    isConnected: Boolean,
    currentTime: String,
    batteryPercentage: Int?,
    isCharging: Boolean,
    currentLanguageCode: String,
    onLanguageClick: () -> Unit
) {
    Scaffold(
        topBar = {
            EsbotTopBar(
                currentTime = currentTime,
                isConnected = isConnected,
                batteryPercentage = batteryPercentage,
                isCharging = isCharging,
                currentLanguageCode = currentLanguageCode,
                onMenuClick = {},
                onLanguageClick = onLanguageClick
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF0F4FF))
        )
    }
}
