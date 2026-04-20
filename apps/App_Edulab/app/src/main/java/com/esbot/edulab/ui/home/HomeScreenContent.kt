package com.esbot.edulab.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import com.esbot.edulab.ui.components.EsbotTopBar
import com.esbot.edulab.ui.components.SideMenu

@Composable
fun HomeScreenContent(
    isConnected: Boolean,
    currentTime: String,
    batteryPercentage: Int?,
    isCharging: Boolean,
    currentLanguageCode: String,
    onLanguageClick: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val isMenuOpen = remember { mutableStateOf(false) }
    val context = LocalContext.current

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            topBar = {
                EsbotTopBar(
                    currentTime = currentTime,
                    isConnected = isConnected,
                    batteryPercentage = batteryPercentage,
                    isCharging = isCharging,
                    currentLanguageCode = currentLanguageCode,
                    onMenuClick = { isMenuOpen.value = true },
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

        // Side Menu (on top of everything)
        if (isMenuOpen.value) {
            SideMenu(
                onClose = { isMenuOpen.value = false },
                onExitApp = {
                    // Pause all robot operations
                    viewModel.pauseAllOperations()
                    // Close the app
                    (context as? android.app.Activity)?.finish()
                }
            )
        }
    }
}
