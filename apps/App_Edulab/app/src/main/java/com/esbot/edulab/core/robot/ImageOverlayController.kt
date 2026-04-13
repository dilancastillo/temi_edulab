package com.esbot.edulab.core.robot

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Shared singleton that bridges RobotReflectionRunner (background thread)
 * with the Compose UI (HomeScreen overlay).
 *
 * - RobotReflectionRunner calls show(base64) → overlay appears
 * - After durationMs the runner calls hide() → overlay disappears and sequence continues
 */
@Singleton
class ImageOverlayController @Inject constructor() {

    private val _imageBase64 = MutableStateFlow<String?>(null)
    val imageBase64: StateFlow<String?> = _imageBase64.asStateFlow()

    fun show(base64: String) {
        _imageBase64.value = base64
    }

    fun hide() {
        _imageBase64.value = null
    }
}
