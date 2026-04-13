package com.esbot.edulab.core.robot

import android.util.Log
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "RobotReflectionRunner"

@Singleton
class RobotReflectionRunner @Inject constructor() : RobotCommandRunner {

    override fun run(command: RobotCommand): Result<Unit> = when (command) {
        is RobotCommand.Navigate -> navigateViaReflection(command.location)
    }

    private fun navigateViaReflection(location: String): Result<Unit> {
        return try {
            val rClass = Class.forName("com.robotemi.sdk.Robot")
            val robot = rClass.getMethod("getInstance").invoke(null) ?: run {
                Log.w(TAG, "Robot.getInstance() = null")
                return Result.failure(IllegalStateException("Robot instance not available"))
            }

            // Log all available goTo overloads to help diagnose signature mismatches
            val allGoTo = rClass.methods.filter { it.name == "goTo" }
            allGoTo.forEach { Log.d(TAG, "goTo overload: ${it}") }

            // Try signatures from most specific to simplest for forward/backward compatibility
            val goToResult = tryGoTo6Params(rClass, robot, location)
                ?: tryGoTo3Params(rClass, robot, location)
                ?: tryGoTo1Param(rClass, robot, location)

            if (goToResult != null) {
                Log.d(TAG, "goTo('$location') invocado correctamente")
                Result.success(Unit)
            } else {
                val signatures = allGoTo.joinToString { it.toString() }
                Log.e(TAG, "No se encontró ninguna firma compatible de goTo. Disponibles: $signatures")
                Result.failure(NoSuchMethodException("No compatible goTo signature found. Available: $signatures"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "navigateViaReflection falló: ${e.message}", e)
            Result.failure(e)
        }
    }

    /** goTo(String, boolean, boolean, SpeedLevel, boolean, boolean) — SDK >= 1.131 */
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

    /** goTo(String, boolean, boolean) — older SDK variants */
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

    /** goTo(String) — simplest fallback */
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
}
