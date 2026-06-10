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
import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext

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
    @ApplicationContext private val context: Context,
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
            // Only resume if robot is still idle (not executing)
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
            val ip = getWifiIpAddress()
            val ssid = getWifiSsid()
            val display = buildString {
                if (ip != null) append("IP: $ip")
                if (ssid != null) append("   Wifi: $ssid")
            }
            _uiState.update { it.copy(robotId = display) }
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
                    // Robot is busy — cancel any pending resume and hide idle animation
                    idleResumeJob?.cancel()
                    _uiState.update { it.copy(showIdleAnimation = false) }
                } else {
                    // Robot is idle — show idle animation
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
    private fun getWifiIpAddress(): String? {
        return try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            for (intf in interfaces) {
                if (!intf.name.contains("wlan", ignoreCase = true)) continue
                for (addr in intf.inetAddresses) {
                    if (!addr.isLoopbackAddress && addr is java.net.Inet4Address) {
                        return addr.hostAddress
                    }
                }
            }
            null
        } catch (e: Exception) {
            null
        }
    }
    private fun getWifiSsid(): String? {
        return try {
            val wifiManager = context.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as android.net.wifi.WifiManager
            val ssid = wifiManager.connectionInfo.ssid
            if (ssid == "<unknown ssid>" || ssid == null) null
            else ssid.trim('"')
        } catch (e: Exception) { null }
    }
}
