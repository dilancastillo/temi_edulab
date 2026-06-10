package com.esbot.edulab.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.esbot.edulab.core.network.NetworkStatusProvider
import com.esbot.edulab.core.robot.BatteryStatusProvider
import com.esbot.edulab.core.robot.ImageOverlayController
import com.esbot.edulab.core.robot.LocationServer
import com.esbot.edulab.core.robot.RobotWebSocketClient
import com.esbot.edulab.core.robot.VideoOverlayController
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
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
    val isCharging: Boolean = false,
    val isLoading: Boolean = true,
    val robotId: String = "",
    val showIdleAnimation: Boolean = false
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val networkStatusProvider: NetworkStatusProvider,
    private val batteryStatusProvider: BatteryStatusProvider,
    private val locationServer: LocationServer,
    private val imageOverlayController: ImageOverlayController,
    private val videoOverlayController: VideoOverlayController,
    private val robotWebSocketClient: RobotWebSocketClient
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState(currentTime = getCurrentTime()))
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    val imageBase64: StateFlow<String?> = imageOverlayController.imageBase64
    val videoUrl: StateFlow<String?> = videoOverlayController.videoUrl

    // Job that re-shows the idle animation after 7 seconds of user touch
    private var idleResumeJob: Job? = null

    fun onVideoCompleted() {
        videoOverlayController.onVideoCompleted()
    }

    /** Called when user taps the idle animation overlay — hides it for 7 seconds */
    fun onIdleAnimationTapped() {
        _uiState.update { it.copy(showIdleAnimation = false) }
        idleResumeJob?.cancel()
        idleResumeJob = viewModelScope.launch {
            delay(7_000)
            if (!robotWebSocketClient.executing.value) {
                _uiState.update { it.copy(showIdleAnimation = true) }
            }
        }
    }

    fun pauseAllOperations() {
        // Stop the location server (which handles robot commands)
        locationServer.stop()
        // Clear any overlays
        imageOverlayController.clearImage()
        videoOverlayController.clearVideo()
    }

    init {
        locationServer.start()
        robotWebSocketClient.start()
        // Resolve robotId and store in UI state
        viewModelScope.launch {
            val id = robotWebSocketClient.resolveRobotId()
            _uiState.update { it.copy(robotId = id) }
        }
        // Mark as loaded after a short delay to show loading indicator
        viewModelScope.launch {
            delay(500)
            _uiState.update { it.copy(isLoading = false) }
        }
        // Observe robot executing state to show/hide idle animation
        viewModelScope.launch {
            robotWebSocketClient.executing.collect { isExecuting ->
                if (isExecuting) {
                    idleResumeJob?.cancel()
                    _uiState.update { it.copy(showIdleAnimation = false) }
                } else {
                    _uiState.update { it.copy(showIdleAnimation = true) }
                }
            }
        }
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
        robotWebSocketClient.stop()
    }
}
