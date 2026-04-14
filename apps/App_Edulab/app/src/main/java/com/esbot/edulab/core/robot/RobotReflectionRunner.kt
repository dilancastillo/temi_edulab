package com.esbot.edulab.core.robot

import android.util.Log
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "RobotReflectionRunner"
private const val NAVIGATE_TIMEOUT_S = 60L
private const val SPEAK_TIMEOUT_S = 120L

@Singleton
class RobotReflectionRunner @Inject constructor(
    private val imageOverlayController: ImageOverlayController,
    private val videoOverlayController: VideoOverlayController
) : RobotCommandRunner {

    override fun run(command: RobotCommand): Result<Unit> = when (command) {
        is RobotCommand.Navigate -> navigateAndWait(command.location)
        is RobotCommand.Say -> speakAndWait(command.text)
        is RobotCommand.ShowImage -> showImageAndWait(command.imageBase64, command.durationMs)
        is RobotCommand.ShowVideo -> showVideoAndWait(command.videoUrl)
    }

    override fun runSequence(commands: List<RobotCommand>): Result<Unit> {
        for (command in commands) {
            val result = run(command)
            if (result.isFailure) return result
        }
        return Result.success(Unit)
    }

    // -------------------------------------------------------------------------
    // Navigate — waits for COMPLETE via OnGoToLocationStatusChangedListener
    // -------------------------------------------------------------------------

    private fun navigateAndWait(location: String): Result<Unit> {
        return try {
            val rClass = Class.forName("com.robotemi.sdk.Robot")
            val robot = rClass.getMethod("getInstance").invoke(null)
                ?: return Result.failure(IllegalStateException("Robot instance not available"))

            val latch = CountDownLatch(1)
            var navError: String? = null

            // Build a dynamic proxy for OnGoToLocationStatusChangedListener
            val listenerClass = Class.forName("com.robotemi.sdk.listeners.OnGoToLocationStatusChangedListener")
            val listener = java.lang.reflect.Proxy.newProxyInstance(
                listenerClass.classLoader,
                arrayOf(listenerClass)
            ) { proxy, method, args ->
                when (method.name) {
                    "equals" -> proxy === args?.getOrNull(0)
                    "hashCode" -> System.identityHashCode(proxy)
                    "toString" -> "GoToListener@${System.identityHashCode(proxy)}"
                    "onGoToLocationStatusChanged" -> {
                        val status = args?.getOrNull(1)?.toString() ?: ""
                        Log.d(TAG, "goTo status: $status")
                        when (status) {
                            "complete" -> latch.countDown()
                            "abort", "reposing" -> {
                                navError = "Navigate aborted: $status"
                                latch.countDown()
                            }
                        }
                        null
                    }
                    else -> null
                }
            }

            // addOnGoToLocationStatusChangedListener(listener)
            rClass.getMethod("addOnGoToLocationStatusChangedListener", listenerClass)
                .invoke(robot, listener)

            // Invoke goTo
            val goToResult = tryGoTo6Params(rClass, robot, location)
                ?: tryGoTo3Params(rClass, robot, location)
                ?: tryGoTo1Param(rClass, robot, location)

            if (goToResult == null) {
                rClass.getMethod("removeOnGoToLocationStatusChangedListener", listenerClass)
                    .invoke(robot, listener)
                return Result.failure(NoSuchMethodException("No compatible goTo signature found"))
            }

            // Wait for completion
            val completed = latch.await(NAVIGATE_TIMEOUT_S, TimeUnit.SECONDS)
            rClass.getMethod("removeOnGoToLocationStatusChangedListener", listenerClass)
                .invoke(robot, listener)

            if (!completed) return Result.failure(RuntimeException("Navigate timeout after ${NAVIGATE_TIMEOUT_S}s"))
            if (navError != null) return Result.failure(RuntimeException(navError))

            Log.d(TAG, "goTo('$location') completado")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "navigateAndWait falló: ${e.message}", e)
            Result.failure(e)
        }
    }

    // -------------------------------------------------------------------------
    // Speak — waits for COMPLETED via TtsListener
    // -------------------------------------------------------------------------

    private fun speakAndWait(text: String): Result<Unit> {
        // Estimate timeout: ~10 chars/second + 10s buffer, minimum 30s
        val timeoutS = maxOf(30L, (text.length / 10L) + 10L)
        return try {
            val rClass = Class.forName("com.robotemi.sdk.Robot")
            val robot = rClass.getMethod("getInstance").invoke(null)
                ?: return Result.failure(IllegalStateException("Robot instance not available"))

            val ttsRequestClass = Class.forName("com.robotemi.sdk.TtsRequest")
            val ttsRequest = ttsRequestClass.getMethod(
                "create",
                String::class.java,
                Boolean::class.javaPrimitiveType
            ).invoke(null, text, false)

            // Get the request id to match callbacks
            val requestId = ttsRequestClass.getMethod("getId").invoke(ttsRequest)

            val latch = CountDownLatch(1)

            // Build a dynamic proxy for Robot.TtsListener
            val ttsListenerClass = Class.forName("com.robotemi.sdk.Robot\$TtsListener")
            val ttsListener = java.lang.reflect.Proxy.newProxyInstance(
                ttsListenerClass.classLoader,
                arrayOf(ttsListenerClass)
            ) { proxy, method, args ->
                when (method.name) {
                    "equals" -> proxy === args?.getOrNull(0)
                    "hashCode" -> System.identityHashCode(proxy)
                    "toString" -> "TtsListener@${System.identityHashCode(proxy)}"
                    "onTtsStatusChanged" -> {
                        val req = args?.getOrNull(0) ?: return@newProxyInstance null
                        val reqClass = req.javaClass
                        val id = reqClass.getMethod("getId").invoke(req)
                        if (id != requestId) return@newProxyInstance null

                        val statusObj = reqClass.getMethod("getStatus").invoke(req)
                        val statusName = statusObj?.toString() ?: ""
                        Log.d(TAG, "TTS status: $statusName")
                        when (statusName) {
                            "COMPLETED" -> latch.countDown()
                            "ERROR", "NOT_ALLOWED" -> {
                                // TTS errors are non-fatal — log and continue sequence
                                Log.w(TAG, "TTS status: $statusName — continuando secuencia")
                                latch.countDown()
                            }
                        }
                        null
                    }
                    else -> null
                }
            }

            rClass.getMethod("addTtsListener", ttsListenerClass).invoke(robot, ttsListener)
            rClass.getMethod("speak", ttsRequestClass).invoke(robot, ttsRequest)

            val completed = latch.await(timeoutS, TimeUnit.SECONDS)
            rClass.getMethod("removeTtsListener", ttsListenerClass).invoke(robot, ttsListener)

            if (!completed) {
                Log.w(TAG, "Speak timeout after ${timeoutS}s — continuando secuencia")
            }

            Log.d(TAG, "speak('$text') completado")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "speakAndWait falló: ${e.message}", e)
            Result.failure(e)
        }
    }

    // -------------------------------------------------------------------------
    // goTo overload helpers
    // -------------------------------------------------------------------------

    private fun tryGoTo6Params(rClass: Class<*>, robot: Any, location: String): Unit? {
        return try {
            val speedLevelClass = Class.forName("com.robotemi.sdk.navigation.model.SpeedLevel")
            val mediumLevel = speedLevelClass.getField("MEDIUM").get(null)
            val method = rClass.getMethod(
                "goTo",
                String::class.java,
                Boolean::class.javaPrimitiveType,
                Boolean::class.javaPrimitiveType,
                speedLevelClass,
                Boolean::class.javaPrimitiveType,
                Boolean::class.javaPrimitiveType
            )
            method.invoke(robot, location, false, false, mediumLevel, false, false)
            Unit
        } catch (e: Exception) {
            Log.d(TAG, "tryGoTo6Params falló: ${e.message}")
            null
        }
    }

    private fun tryGoTo3Params(rClass: Class<*>, robot: Any, location: String): Unit? {
        return try {
            val method = rClass.getMethod(
                "goTo",
                String::class.java,
                Boolean::class.javaPrimitiveType,
                Boolean::class.javaPrimitiveType
            )
            method.invoke(robot, location, false, false)
            Unit
        } catch (e: Exception) {
            Log.d(TAG, "tryGoTo3Params falló: ${e.message}")
            null
        }
    }

    private fun tryGoTo1Param(rClass: Class<*>, robot: Any, location: String): Unit? {
        return try {
            val method = rClass.getMethod("goTo", String::class.java)
            method.invoke(robot, location)
            Unit
        } catch (e: Exception) {
            Log.d(TAG, "tryGoTo1Param falló: ${e.message}")
            null
        }
    }

    // -------------------------------------------------------------------------
    // ShowImage — shows overlay via Compose StateFlow, waits durationMs
    // -------------------------------------------------------------------------

    private fun showImageAndWait(imageBase64: String, durationMs: Long): Result<Unit> {
        return try {
            imageOverlayController.show(imageBase64)
            Thread.sleep(durationMs)
            imageOverlayController.hide()
            Log.d(TAG, "showImage completado (${durationMs}ms)")
            Result.success(Unit)
        } catch (e: Exception) {
            imageOverlayController.hide()
            Log.e(TAG, "showImageAndWait falló: ${e.message}", e)
            Result.failure(e)
        }
    }

    private fun showVideoAndWait(videoUrl: String): Result<Unit> {
        return try {
            val latch = videoOverlayController.show(videoUrl)
            Log.d(TAG, "showVideo iniciado: $videoUrl")
            // Wait up to 10 minutes for video to complete
            latch.await(600, java.util.concurrent.TimeUnit.SECONDS)
            Log.d(TAG, "showVideo completado")
            Result.success(Unit)
        } catch (e: Exception) {
            videoOverlayController.onVideoCompleted()
            Log.e(TAG, "showVideoAndWait falló: ${e.message}", e)
            Result.failure(e)
        }
    }
}
