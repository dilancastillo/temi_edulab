package com.esbot.edulab.ui.home

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import com.esbot.edulab.ui.theme.EduLabAppTheme

@Composable
fun HomeScreen(
    viewModel: HomeViewModel = hiltViewModel(),
    onLanguageClick: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val configuration = LocalConfiguration.current
    val isSpanish = configuration.locales[0].language == "es"

    HomeScreenContent(
        isConnected = uiState.isConnected,
        currentTime = uiState.currentTime,
        batteryPercentage = uiState.batteryPercentage,
        isCharging = uiState.isCharging,
        currentLanguageCode = if (isSpanish) "ES" else "EN",
        onLanguageClick = {
            onLanguageClick(if (isSpanish) "en" else "es")
        }
    )
}

@Preview(showBackground = true, widthDp = 1280, heightDp = 800)
@Composable
fun HomeScreenPreview() {
    EduLabAppTheme {
        HomeScreenContent(
            isConnected = true,
            currentTime = "10:45 AM",
            batteryPercentage = 75,
            isCharging = false,
            currentLanguageCode = "EN",
            onLanguageClick = {}
        )
    }
}
