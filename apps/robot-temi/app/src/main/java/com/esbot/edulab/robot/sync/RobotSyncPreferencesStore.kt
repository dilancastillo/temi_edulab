package com.esbot.edulab.robot.sync

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.io.IOException

private val Context.robotSyncDataStore by preferencesDataStore(name = "robot_sync")

data class RobotSyncPreferences(
    val apiBaseUrl: String,
    val pairingRequestId: String?,
    val robotToken: String?,
    val robotId: String?,
    val pairCode: String?,
    val sessionUri: String?,
)

class RobotSyncPreferencesStore(
    private val context: Context,
) {
    val state: Flow<RobotSyncPreferences> =
        context.robotSyncDataStore.data
            .catch { error ->
                if (error is IOException) {
                    emit(emptyPreferences())
                } else {
                    throw error
                }
            }.map(::toState)

    suspend fun current(): RobotSyncPreferences = state.first()

    suspend fun updateBaseUrl(rawValue: String) {
        val normalized = rawValue.trim().trimEnd('/')
        context.robotSyncDataStore.edit { preferences ->
            if (normalized.isBlank()) {
                preferences.remove(Keys.ApiBaseUrl)
            } else {
                preferences[Keys.ApiBaseUrl] = normalized
            }
        }
    }

    suspend fun savePendingPairing(pairingRequestId: String, pairCode: String, sessionUri: String?) {
        context.robotSyncDataStore.edit { preferences ->
            preferences[Keys.PairingRequestId] = pairingRequestId
            preferences[Keys.PairCode] = pairCode
            if (!sessionUri.isNullOrBlank()) {
                preferences[Keys.SessionUri] = sessionUri
            }
        }
    }

    suspend fun completePairing(robotId: String?, robotToken: String) {
        context.robotSyncDataStore.edit { preferences ->
            preferences.remove(Keys.PairingRequestId)
            preferences[Keys.RobotToken] = robotToken
            if (!robotId.isNullOrBlank()) {
                preferences[Keys.RobotId] = robotId
            }
        }
    }

    suspend fun clearPendingPairing() {
        context.robotSyncDataStore.edit { preferences ->
            preferences.remove(Keys.PairingRequestId)
        }
    }

    private fun toState(preferences: Preferences): RobotSyncPreferences {
        return RobotSyncPreferences(
            apiBaseUrl = preferences[Keys.ApiBaseUrl].orEmpty(),
            pairingRequestId = preferences[Keys.PairingRequestId],
            robotToken = preferences[Keys.RobotToken],
            robotId = preferences[Keys.RobotId],
            pairCode = preferences[Keys.PairCode],
            sessionUri = preferences[Keys.SessionUri],
        )
    }

    private object Keys {
        val ApiBaseUrl = stringPreferencesKey("api_base_url")
        val PairingRequestId = stringPreferencesKey("pairing_request_id")
        val RobotToken = stringPreferencesKey("robot_token")
        val RobotId = stringPreferencesKey("robot_id")
        val PairCode = stringPreferencesKey("pair_code")
        val SessionUri = stringPreferencesKey("session_uri")
    }
}
