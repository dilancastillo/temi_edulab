package com.esbot.edulab.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.esbot.edulab.core.network.NetworkStatusProvider
import com.esbot.edulab.core.robot.BatteryStatusProvider
import com.esbot.edulab.core.robot.ImageOverlayController
import com.esbot.edulab.core.robot.LocationServer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

data class HomeUiState(
    val isConnected: Boolean = false,
    val currentTime: String = "",
    val batteryPercentage: Int? = null,
    val isCharging: Boolean = false
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val networkStatusProvider: NetworkStatusProvider,
    private val batteryStatusProvider: BatteryStatusProvider,
    private val locationServer: LocationServer,
    private val imageOverlayController: ImageOverlayController
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState(currentTime = getCurrentTime()))
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    val imageBase64: StateFlow<String?> = imageOverlayController.imageBase64

    init {
        locationServer.start()
        viewModelScope.launch {
            networkStatusProvider.isConnected.collect { connected ->
                _uiState.update { it.copy(isConnected = connected) }
            }
        }
        viewModelScope.launch {
            while (true) {
                delay(60_000)
                _uiState.update { it.copy(currentTime = getCurrentTime()) }
            }
        }
        viewModelScope.launch {
            batteryStatusProvider.batteryPercentage.collect { percentage ->
                _uiState.update { it.copy(batteryPercentage = percentage) }
            }
        }
        viewModelScope.launch {
            batteryStatusProvider.isCharging.collect { charging ->
                _uiState.update { it.copy(isCharging = charging) }
            }
        }
    }

    private fun getCurrentTime(): String =
        SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())

    override fun onCleared() {
        super.onCleared()
        locationServer.stop()
    }
}
