package com.esbot.edulab.core.robot

import kotlinx.coroutines.flow.StateFlow

interface BatteryStatusProvider {
    val batteryPercentage: StateFlow<Int?>
    val isCharging: StateFlow<Boolean>
    fun startObserving()
    fun stopObserving()
}
