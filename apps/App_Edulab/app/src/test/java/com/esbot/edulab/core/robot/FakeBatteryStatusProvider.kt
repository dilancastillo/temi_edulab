package com.esbot.edulab.core.robot

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class FakeBatteryStatusProvider(
    initialPercentage: Int? = null,
    initialCharging: Boolean = false
) : BatteryStatusProvider {
    private val _batteryPercentage = MutableStateFlow(initialPercentage)
    private val _isCharging = MutableStateFlow(initialCharging)

    override val batteryPercentage: StateFlow<Int?> = _batteryPercentage
    override val isCharging: StateFlow<Boolean> = _isCharging

    override fun startObserving() = Unit
    override fun stopObserving() = Unit

    fun emitPercentage(value: Int?) { _batteryPercentage.value = value }
    fun emitCharging(value: Boolean) { _isCharging.value = value }
}
