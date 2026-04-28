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

    override fun run(command: RobotCommand): Result<Unit> {
        return when (command) {
            is RobotCommand.Navigate -> navigateAndWait(command.location)
            is RobotCommand.Say -> speakAndWait(command.text)
            is RobotCommand.ShowImage -> showImageAndWait(command.imageUrl, command.durationMs)
            is RobotCommand.ShowVideo -> showVideoAndWait(command.videoUrl)
            is RobotCommand.AskCondition -> askConditionAndWait(command.question, command.options)
            is RobotCommand.Repeat -> {
                if (command.times < 1) return Result.success(Unit)
                repeat(command.times) {
                    val result = runSequence(command.commands)
                    if (result.isFailure) return result
                }
                Result.success(Unit)
            }
        }
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

    private fun showImageAndWait(imageUrl: String, durationMs: Long): Result<Unit> {
        return try {
            // Download image from URL and convert to base64
            val imageBase64 = downloadImageAsBase64(imageUrl)
            if (imageBase64.isNullOrEmpty()) {
                Log.e(TAG, "showImageAndWait: No se pudo descargar la imagen desde $imageUrl")
                return Result.failure(Exception("Failed to download image"))
            }
            
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

    private fun downloadImageAsBase64(imageUrl: String): String? {
        return try {
            val url = java.net.URL(imageUrl)
            val connection = url.openConnection() as java.net.HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            
            if (connection.responseCode != 200) {
                Log.e(TAG, "downloadImageAsBase64: HTTP ${connection.responseCode}")
                return null
            }
            
            val inputStream = connection.inputStream
            val bytes = inputStream.readBytes()
            inputStream.close()
            connection.disconnect()
            
            android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e(TAG, "downloadImageAsBase64 falló: ${e.message}", e)
            null
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

    // -------------------------------------------------------------------------
    // AskCondition — uses askQuestion() SDK method to speak + listen in one call
    // -------------------------------------------------------------------------

    private fun askConditionAndWait(
        question: String,
        options: List<ConditionOption>
    ): Result<Unit> {
        return try {
            val rClass = Class.forName("com.robotemi.sdk.Robot")
            val robot = rClass.getMethod("getInstance").invoke(null)
                ?: return Result.failure(IllegalStateException("Robot instance not available"))

            val latch = CountDownLatch(1)
            var matchedAction: RobotCommand? = null

            // Step 1: Build and register AsrListener BEFORE calling askQuestion
            val asrListenerClass = Class.forName("com.robotemi.sdk.Robot\$AsrListener")
            val asrListener = java.lang.reflect.Proxy.newProxyInstance(
                asrListenerClass.classLoader,
                arrayOf(asrListenerClass)
            ) { proxy, method, args ->
                when (method.name) {
                    "equals" -> proxy === args?.getOrNull(0)
                    "hashCode" -> System.identityHashCode(proxy)
                    "toString" -> "AsrListener@${System.identityHashCode(proxy)}"
                    "onAsrResult" -> {
                        // Handle both old (String only) and new (String, SttLanguage) signatures
                        val asrText = args?.getOrNull(0)?.toString()?.trim()?.lowercase() ?: ""
                        Log.d(TAG, "ASR result: '$asrText'")
                        if (asrText.isNotEmpty()) {
                            // Normalize both ASR text and keywords for better matching
                            var normalizedAsr = asrText
                                .replace(Regex("[áàäâ]"), "a")
                                .replace(Regex("[éèëê]"), "e")
                                .replace(Regex("[íìïî]"), "i")
                                .replace(Regex("[óòöô]"), "o")
                                .replace(Regex("[úùüû]"), "u")
                                .replace(Regex("[ñ]"), "n")
                                .replace(Regex("[^a-z0-9\\s]"), "")
                            
                            // Convert written numbers to digits
                            normalizedAsr = normalizedAsr
                                .replace(Regex("\\bcero\\b"), "0")
                                .replace(Regex("\\buno\\b"), "1")
                                .replace(Regex("\\bdos\\b"), "2")
                                .replace(Regex("\\btres\\b"), "3")
                                .replace(Regex("\\bcuatro\\b"), "4")
                                .replace(Regex("\\bcinco\\b"), "5")
                                .replace(Regex("\\bseis\\b"), "6")
                                .replace(Regex("\\bsiete\\b"), "7")
                                .replace(Regex("\\bocho\\b"), "8")
                                .replace(Regex("\\bnueve\\b"), "9")
                                .replace(Regex("\\bdiez\\b"), "10")
                            
                            normalizedAsr = normalizedAsr
                                .replace(Regex("\\s+"), "")  // Remove all spaces
                                .trim()
                            
                            Log.d(TAG, "ASR normalized: '$normalizedAsr'")
                            
                            matchedAction = options.firstOrNull { opt ->
                                var normalizedKeyword = opt.keyword.trim().lowercase()
                                    .replace(Regex("[áàäâ]"), "a")
                                    .replace(Regex("[éèëê]"), "e")
                                    .replace(Regex("[íìïî]"), "i")
                                    .replace(Regex("[óòöô]"), "o")
                                    .replace(Regex("[úùüû]"), "u")
                                    .replace(Regex("[ñ]"), "n")
                                    .replace(Regex("[^a-z0-9\\s]"), "")
                                
                                // Convert written numbers to digits
                                normalizedKeyword = normalizedKeyword
                                    .replace(Regex("\\bcero\\b"), "0")
                                    .replace(Regex("\\buno\\b"), "1")
                                    .replace(Regex("\\bdos\\b"), "2")
                                    .replace(Regex("\\btres\\b"), "3")
                                    .replace(Regex("\\bcuatro\\b"), "4")
                                    .replace(Regex("\\bcinco\\b"), "5")
                                    .replace(Regex("\\bseis\\b"), "6")
                                    .replace(Regex("\\bsiete\\b"), "7")
                                    .replace(Regex("\\bocho\\b"), "8")
                                    .replace(Regex("\\bnueve\\b"), "9")
                                    .replace(Regex("\\bdiez\\b"), "10")
                                
                                normalizedKeyword = normalizedKeyword
                                    .replace(Regex("\\s+"), "")  // Remove all spaces
                                    .trim()
                                
                                Log.d(TAG, "  Comparing '$normalizedAsr' with keyword '$normalizedKeyword'")
                                
                                // Match if they're equal or if ASR contains keyword
                                normalizedAsr == normalizedKeyword || normalizedAsr.contains(normalizedKeyword)
                            }?.action
                            
                            if (matchedAction != null) {
                                Log.d(TAG, "✓ ASR match encontrado")
                            } else {
                                Log.d(TAG, "✗ ASR sin match")
                            }
                        }
                        latch.countDown()
                        null
                    }
                    else -> null
                }
            }

            // Register listener BEFORE askQuestion
            rClass.getMethod("addAsrListener", asrListenerClass).invoke(robot, asrListener)
            Log.d(TAG, "AsrListener registrado")

            // Step 2: Call askQuestion — this speaks the question AND opens ASR listening
            try {
                rClass.getMethod("askQuestion", String::class.java).invoke(robot, question)
                Log.d(TAG, "askQuestion('$question') invocado exitosamente")
            } catch (e: Exception) {
                Log.e(TAG, "askQuestion() falló: ${e.message}", e)
                rClass.getMethod("removeAsrListener", asrListenerClass).invoke(robot, asrListener)
                return Result.failure(e)
            }

            // Step 3: Wait up to 15 seconds for ASR result
            val heard = latch.await(15L, TimeUnit.SECONDS)
            
            // Always remove listener and finish conversation
            try {
                rClass.getMethod("removeAsrListener", asrListenerClass).invoke(robot, asrListener)
            } catch (e: Exception) {
                Log.w(TAG, "removeAsrListener falló: ${e.message}")
            }

            try {
                rClass.getMethod("finishConversation").invoke(robot)
                Log.d(TAG, "finishConversation() invocado")
            } catch (e: Exception) {
                Log.w(TAG, "finishConversation() falló: ${e.message}")
            }

            if (!heard) {
                Log.d(TAG, "ASR timeout (15s) — continuando secuencia sin acción")
                return Result.success(Unit)
            }

            // Step 4: Execute matched action if any
            val action = matchedAction
            if (action != null) {
                Log.d(TAG, "ASR match encontrado, ejecutando acción: $action")
                return run(action)
            }

            Log.d(TAG, "ASR sin match — continuando secuencia")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "askConditionAndWait falló: ${e.message}", e)
            Result.failure(e)
        }
    }
}
