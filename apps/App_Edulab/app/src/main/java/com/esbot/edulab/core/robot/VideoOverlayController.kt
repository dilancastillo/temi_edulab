package com.esbot.edulab.core.robot

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.CountDownLatch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VideoOverlayController @Inject constructor() {

    private val _videoUrl = MutableStateFlow<String?>(null)
    val videoUrl: StateFlow<String?> = _videoUrl.asStateFlow()

    private var completionLatch: CountDownLatch? = null

    fun show(url: String): CountDownLatch {
        val latch = CountDownLatch(1)
        completionLatch = latch
        _videoUrl.value = url
        return latch
    }

    fun onVideoCompleted() {
        _videoUrl.value = null
        completionLatch?.countDown()
        completionLatch = null
    }

    fun clearVideo() {
        _videoUrl.value = null
        completionLatch?.countDown()
        completionLatch = null
    }
}
