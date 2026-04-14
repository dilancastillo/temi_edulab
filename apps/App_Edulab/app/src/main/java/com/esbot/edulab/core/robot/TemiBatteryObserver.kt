package com.esbot.edulab.core.robot

import android.content.Context
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "TemiBattery"

@Singleton
class TemiBatteryObserver @Inject constructor(
    @ApplicationContext private val context: Context
) : BatteryStatusProvider {

    private val _batteryPercentage = MutableStateFlow<Int?>(null)
    override val batteryPercentage: StateFlow<Int?> = _batteryPercentage

    private val _isCharging = MutableStateFlow(false)
    override val isCharging: StateFlow<Boolean> = _isCharging

    private var robot: Any? = null
    private var robotClass: Class<*>? = null
    private var robotReadyListener: Any? = null
    private var robotReadyListenerClass: Class<*>? = null
    private var batteryListener: Any? = null
    private var batteryListenerClass: Class<*>? = null

    override fun startObserving() {
        try {
            val rClass = Class.forName("com.robotemi.sdk.Robot")
            val r = rClass.getMethod("getInstance").invoke(null) ?: run {
                Log.w(TAG, "Robot.getInstance() = null")
                return
            }
            Log.d(TAG, "Robot encontrado: $r")

            // OnRobotReadyListener
            val readyClass = Class.forName("com.robotemi.sdk.listeners.OnRobotReadyListener")
            val readyListener = java.lang.reflect.Proxy.newProxyInstance(
                readyClass.classLoader,
                arrayOf(readyClass)
            ) { proxy, method, args ->
                when (method.name) {
                    "equals" -> proxy === args?.getOrNull(0)
                    "hashCode" -> System.identityHashCode(proxy)
                    "toString" -> "OnRobotReadyListener@${System.identityHashCode(proxy)}"
                    "onRobotReady" -> {
                        val isReady = args?.getOrNull(0) as? Boolean ?: false
                        Log.d(TAG, "onRobotReady — isReady: $isReady")
                        if (isReady) readInitialBattery(r, rClass)
                        null
                    }
                    else -> null
                }
            }
            rClass.getMethod("addOnRobotReadyListener", readyClass).invoke(r, readyListener)
            Log.d(TAG, "OnRobotReadyListener registrado")

            // OnBatteryStatusChangedListener
            val batteryClass = Class.forName("com.robotemi.sdk.listeners.OnBatteryStatusChangedListener")
            val bListener = java.lang.reflect.Proxy.newProxyInstance(
                batteryClass.classLoader,
                arrayOf(batteryClass)
            ) { proxy, method, args ->
                when (method.name) {
                    "equals" -> proxy === args?.getOrNull(0)
                    "hashCode" -> System.identityHashCode(proxy)
                    "toString" -> "OnBatteryStatusChangedListener@${System.identityHashCode(proxy)}"
                    "onBatteryStatusChanged" -> {
                        if (args != null && args.isNotEmpty()) {
                            val data = args[0] ?: return@newProxyInstance null
                            Log.d(TAG, "onBatteryStatusChanged: $data")
                            parseBatteryData(data)
                        }
                        null
                    }
                    else -> null
                }
            }
            rClass.getMethod("addOnBatteryStatusChangedListener", batteryClass).invoke(r, bListener)
            Log.d(TAG, "OnBatteryStatusChangedListener registrado")

            robot = r
            robotClass = rClass
            robotReadyListener = readyListener
            robotReadyListenerClass = readyClass
            batteryListener = bListener
            batteryListenerClass = batteryClass

        } catch (e: Exception) {
            Log.e(TAG, "startObserving falló: ${e.message}", e)
        }
    }

    override fun stopObserving() {
        try {
            val r = robot ?: return
            val rClass = robotClass ?: return
            robotReadyListener?.let { listener ->
                robotReadyListenerClass?.let { cls ->
                    rClass.getMethod("removeOnRobotReadyListener", cls).invoke(r, listener)
                    Log.d(TAG, "OnRobotReadyListener removido")
                }
            }
            batteryListener?.let { listener ->
                batteryListenerClass?.let { cls ->
                    rClass.getMethod("removeOnBatteryStatusChangedListener", cls).invoke(r, listener)
                    Log.d(TAG, "OnBatteryStatusChangedListener removido")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "stopObserving falló: ${e.message}", e)
        } finally {
            robot = null
            robotClass = null
            robotReadyListener = null
            robotReadyListenerClass = null
            batteryListener = null
            batteryListenerClass = null
        }
    }

    private fun readInitialBattery(r: Any, rClass: Class<*>) {
        try {
            val data = rClass.getMethod("getBatteryData").invoke(r) ?: run {
                Log.w(TAG, "getBatteryData() = null")
                return
            }
            parseBatteryData(data)
        } catch (e: Exception) {
            Log.e(TAG, "readInitialBattery falló: ${e.message}", e)
        }
    }

    private fun parseBatteryData(data: Any) {
        try {
            val levelField = data.javaClass.getDeclaredField("level")
            levelField.isAccessible = true
            val level = levelField.getInt(data)

            val chargingField = data.javaClass.getDeclaredField("isCharging")
            chargingField.isAccessible = true
            val charging = chargingField.getBoolean(data)

            if (level < 0 || level > 100) {
                Log.w(TAG, "Nivel de batería fuera de rango: $level — ignorado")
                return
            }

            Log.d(TAG, "Batería — level: $level, isCharging: $charging")
            _batteryPercentage.value = level
            _isCharging.value = charging
        } catch (e: Exception) {
            Log.e(TAG, "parseBatteryData falló: ${e.message}", e)
        }
    }
}
