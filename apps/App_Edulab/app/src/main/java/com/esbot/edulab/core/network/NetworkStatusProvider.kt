package com.esbot.edulab.core.network

import kotlinx.coroutines.flow.StateFlow

interface NetworkStatusProvider {
    val isConnected: StateFlow<Boolean>
}
