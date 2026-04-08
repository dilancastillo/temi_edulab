package com.esbot.edulab.robot.runtime

import android.content.Context
import android.util.Log
import com.esbot.edulab.robot.model.RobotCommandResult
import com.esbot.edulab.robot.model.RobotDiagnostics
import com.esbot.edulab.robot.model.RobotLocationDiagnostic
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TemiReflectionBridge(
    private val context: Context,
    private val fallback: MockRobotBridge = MockRobotBridge(),
) : RobotBridge {
    override suspend fun fetchDiagnostics(): RobotDiagnostics =
        withContext(Dispatchers.IO) {
            val robot = robotInstance()
            if (robot == null) {
                return@withContext fallback.fetchDiagnostics()
            }
            try {
                val ready = callBoolean(robot, "isReady") ?: false
                val locations = callLocations(robot)
                val batteryInfo = callNoArg(robot, "getBatteryData")
                val batteryPercent = readInt(batteryInfo, listOf("getBatteryPercentage", "getLevel", "getPercentage"))
                    ?: if (ready) 78 else 0
                val isCharging = readBoolean(batteryInfo, listOf("isCharging", "getIsCharging")) ?: false
                val rawStatus = when {
                    ready -> "READY"
                    else -> "DISCONNECTED"
                }

                RobotDiagnostics(
                    ready = ready,
                    connectionState = if (ready) "CONNECTED" else "DISCONNECTED",
                    batteryPercent = batteryPercent,
                    isCharging = isCharging,
                    mapReady = locations.isNotEmpty(),
                    locations = locations,
                    rawStatus = rawStatus,
                )
            } catch (error: Throwable) {
                Log.w("TemiReflectionBridge", "Falling back to mock diagnostics", error)
                fallback.fetchDiagnostics()
            }
        }

    override suspend fun hideTopBar(hidden: Boolean): RobotCommandResult =
        withContext(Dispatchers.IO) {
            val robot = robotInstance()
            if (robot == null) {
                return@withContext fallback.hideTopBar(hidden)
            }
            try {
                val hiddenResult =
                    invokeBestMatch(
                        target = robot,
                        names = if (hidden) listOf("hideTopBar") else listOf("showTopBar"),
                        args = listOf(),
                    )
                if (hiddenResult != null) {
                    RobotCommandResult(success = true)
                } else {
                    fallback.hideTopBar(hidden)
                }
            } catch (error: Throwable) {
                Log.w("TemiReflectionBridge", "Top bar reflection failed", error)
                fallback.hideTopBar(hidden)
            }
        }

    override suspend fun speak(text: String, languageCode: String): RobotCommandResult =
        withContext(Dispatchers.IO) {
            val robot = robotInstance()
            if (robot == null) {
                return@withContext fallback.speak(text, languageCode)
            }
            try {
                val request = createTtsRequest(text)
                val invoked =
                    when {
                        request != null -> invokeBestMatch(robot, listOf("speak"), listOf(request))
                        else -> invokeBestMatch(robot, listOf("speak"), listOf(text))
                    }
                if (invoked != null) {
                    RobotCommandResult(success = true)
                } else {
                    fallback.speak(text, languageCode)
                }
            } catch (error: Throwable) {
                Log.w("TemiReflectionBridge", "Speak reflection failed", error)
                fallback.speak(text, languageCode)
            }
        }

    override suspend fun goTo(locationName: String): RobotCommandResult =
        withContext(Dispatchers.IO) {
            val robot = robotInstance()
            if (robot == null) {
                return@withContext fallback.goTo(locationName)
            }
            try {
                val invoked = invokeBestMatch(robot, listOf("goTo"), listOf(locationName))
                if (invoked != null) {
                    RobotCommandResult(success = true)
                } else {
                    fallback.goTo(locationName)
                }
            } catch (error: Throwable) {
                Log.w("TemiReflectionBridge", "goTo reflection failed", error)
                fallback.goTo(locationName)
            }
        }

    override suspend fun stopMovement(): RobotCommandResult =
        withContext(Dispatchers.IO) {
            val robot = robotInstance()
            if (robot == null) {
                return@withContext fallback.stopMovement()
            }
            try {
                val invoked = invokeBestMatch(robot, listOf("stopMovement", "stopMovementWithLevel"), listOf())
                if (invoked != null) {
                    RobotCommandResult(success = true)
                } else {
                    fallback.stopMovement()
                }
            } catch (error: Throwable) {
                Log.w("TemiReflectionBridge", "stopMovement reflection failed", error)
                fallback.stopMovement()
            }
        }

    private fun robotInstance(): Any? {
        return runCatching {
            val robotClass = context.classLoader.loadClass("com.robotemi.sdk.Robot")
            val getInstance = robotClass.getMethod("getInstance")
            getInstance.invoke(null)
        }.getOrNull()
    }

    private fun createTtsRequest(text: String): Any? {
        val clazz = runCatching {
            context.classLoader.loadClass("com.robotemi.sdk.TtsRequest")
        }.getOrNull() ?: return null

        val createMethod = clazz.methods.firstOrNull {
            it.name == "create" && it.parameterTypes.size == 1 && it.parameterTypes.first() == String::class.java
        } ?: return null

        return runCatching { createMethod.invoke(null, text) }.getOrNull()
    }

    private fun callLocations(robot: Any): List<RobotLocationDiagnostic> {
        val raw = callNoArg(robot, "getLocations") ?: return emptyList()
        val locations = (raw as? Iterable<*>)?.mapNotNull { value ->
            value?.toString()?.takeIf { it.isNotBlank() }?.let { name ->
                RobotLocationDiagnostic(name = name, available = true, detail = "Disponible")
            }
        }.orEmpty()

        return locations
    }

    private fun callNoArg(target: Any, name: String): Any? {
        return runCatching {
            target.javaClass.methods.firstOrNull { it.name == name && it.parameterTypes.isEmpty() }?.invoke(target)
        }.getOrNull()
    }

    private fun callBoolean(target: Any, name: String): Boolean? {
        return (callNoArg(target, name) as? Boolean)
    }

    private fun readInt(target: Any?, candidateNames: List<String>): Int? {
        if (target == null) return null
        return candidateNames.firstNotNullOfOrNull { methodName ->
            runCatching {
                target.javaClass.methods.firstOrNull {
                    it.name == methodName && it.parameterTypes.isEmpty()
                }?.invoke(target) as? Int
            }.getOrNull()
        }
    }

    private fun readBoolean(target: Any?, candidateNames: List<String>): Boolean? {
        if (target == null) return null
        return candidateNames.firstNotNullOfOrNull { methodName ->
            runCatching {
                target.javaClass.methods.firstOrNull {
                    it.name == methodName && it.parameterTypes.isEmpty()
                }?.invoke(target) as? Boolean
            }.getOrNull()
        }
    }

    private fun invokeBestMatch(target: Any, names: List<String>, args: List<Any>): Any? {
        val methods = target.javaClass.methods.filter { it.name in names }
        val method = methods.firstOrNull { candidate ->
            candidate.parameterTypes.size == args.size &&
                candidate.parameterTypes.zip(args).all { (parameterType, arg) ->
                    parameterType.isAssignableFrom(arg.javaClass) ||
                        wrapper(parameterType).isAssignableFrom(arg.javaClass)
                }
        } ?: methods.firstOrNull { it.parameterTypes.isEmpty() && args.isEmpty() }

        return method?.let {
            runCatching { it.invoke(target, *args.toTypedArray()) }.getOrNull()
        }
    }

    private fun wrapper(type: Class<*>): Class<*> {
        return when (type) {
            java.lang.Boolean.TYPE -> java.lang.Boolean::class.java
            java.lang.Integer.TYPE -> java.lang.Integer::class.java
            java.lang.Long.TYPE -> java.lang.Long::class.java
            java.lang.Float.TYPE -> java.lang.Float::class.java
            java.lang.Double.TYPE -> java.lang.Double::class.java
            else -> type
        }
    }
}
