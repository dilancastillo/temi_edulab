package com.esbot.edulab.core.robot

import com.esbot.edulab.BuildConfig

internal object MqttConfig {
    val BROKER_URI: String get() = BuildConfig.MQTT_BROKER_URI
    val USERNAME: String   get() = BuildConfig.MQTT_USERNAME
    val PASSWORD: String   get() = BuildConfig.MQTT_PASSWORD
    const val CLIENT_ID_PREFIX = "temi-robot-"
}
