package com.esbot.edulab.ui.home

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
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
    val imageBase64 by viewModel.imageBase64.collectAsState()
    val configuration = LocalConfiguration.current
    val isSpanish = configuration.locales[0].language == "es"

    Box(modifier = Modifier.fillMaxSize()) {
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

        // Full-screen image overlay when ShowImage command is active
        if (imageBase64 != null) {
            val bytes = Base64.decode(imageBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            if (bitmap != null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Fit
                    )
                }
            }
        }
    }
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
