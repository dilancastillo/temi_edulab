package com.esbot.edulab.core.robot

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.util.Log
import com.esbot.edulab.R
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "SoundPlayer"
private const val PLAY_TIMEOUT_S = 15L

/** Reproduce los sonidos cortos del bloque «reproducir audio». */
interface SoundPlayer {
    /** Reproduce el sonido y espera a que termine. */
    fun playAndWait(clip: String): Result<Unit>

    /** No hace nada: para pruebas y para cuando no hay contexto de Android. */
    object None : SoundPlayer {
        override fun playAndWait(clip: String): Result<Unit> = Result.success(Unit)
    }
}

@Singleton
class AndroidSoundPlayer @Inject constructor(
    @ApplicationContext private val context: Context
) : SoundPlayer {

    override fun playAndWait(clip: String): Result<Unit> {
        val resId = when (clip) {
            "bell" -> R.raw.temi_bell
            "clap" -> R.raw.temi_clap
            else -> R.raw.temi_confirm
        }
        val done = CountDownLatch(1)
        val player = MediaPlayer.create(context, resId)
            ?: return Result.failure(IllegalStateException("No se pudo cargar el sonido $clip"))
        return try {
            player.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            player.setOnCompletionListener { done.countDown() }
            player.setOnErrorListener { _, what, extra ->
                Log.w(TAG, "Error reproduciendo $clip: what=$what extra=$extra")
                done.countDown()
                true
            }
            Log.d(TAG, "Reproduciendo $clip")
            player.start()
            if (!done.await(PLAY_TIMEOUT_S, TimeUnit.SECONDS)) {
                Log.w(TAG, "El sonido $clip no terminó en ${PLAY_TIMEOUT_S}s")
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "No se pudo reproducir $clip: ${e.message}", e)
            Result.failure(e)
        } finally {
            player.release()
        }
    }
}
