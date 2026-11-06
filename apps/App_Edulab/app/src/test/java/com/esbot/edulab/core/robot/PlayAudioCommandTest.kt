package com.esbot.edulab.core.robot

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** El bloque «reproducir audio» llega como PlayAudio y el runner lo pasa al reproductor. */
class PlayAudioCommandTest {

    private class RecordingSoundPlayer : SoundPlayer {
        val played = mutableListOf<String>()
        override fun playAndWait(clip: String): Result<Unit> {
            played += clip
            return Result.success(Unit)
        }
    }

    @Test
    fun `PlayAudio reproduce el sonido pedido`() {
        val player = RecordingSoundPlayer()
        val runner = RobotReflectionRunner(ImageOverlayController(), VideoOverlayController(), player)

        val result = runner.runSequence(listOf(RobotCommand.PlayAudio("bell"), RobotCommand.PlayAudio("clap")))

        assertTrue(result.isSuccess)
        assertEquals(listOf("bell", "clap"), player.played)
    }

    @Test
    fun `PlayAudio dentro de repetir suena en cada vuelta`() {
        val player = RecordingSoundPlayer()
        val runner = RobotReflectionRunner(ImageOverlayController(), VideoOverlayController(), player)

        runner.run(RobotCommand.Repeat(3, listOf(RobotCommand.PlayAudio("bell"))))

        assertEquals(listOf("bell", "bell", "bell"), player.played)
    }
}
