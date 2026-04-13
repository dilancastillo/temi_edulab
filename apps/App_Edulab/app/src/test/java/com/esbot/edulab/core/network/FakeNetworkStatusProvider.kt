package com.esbot.edulab.core.network

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class FakeNetworkStatusProvider(
    initial: Boolean = false
) : NetworkStatusProvider {
    private val _isConnected = MutableStateFlow(initial)
    override val isConnected: StateFlow<Boolean> = _isConnected

    fun emit(value: Boolean) {
        _isConnected.value = value
    }
}
