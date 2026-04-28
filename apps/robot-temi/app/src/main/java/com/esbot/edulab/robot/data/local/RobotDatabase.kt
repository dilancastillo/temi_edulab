package com.esbot.edulab.robot.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "robot_snapshot")
data class RobotSnapshotEntity(
    @PrimaryKey val id: Int = 1,
    val institutionName: String,
    val assignedRobotName: String,
    val classroomName: String,
    val teacherName: String,
    val nextTurnName: String?,
    val activeMissionId: String?,
    val activeMissionName: String?,
    val activeStudentName: String?,
    val currentStepLabel: String?,
    val currentActionHint: String?,
    val classPhase: String,
    val bannerState: String,
    val connectionState: String,
    val batteryPercent: Int,
    val batteryCharging: Boolean,
    val progressPercent: Int,
    val robotStatusLabel: String,
    val apiBaseUrl: String,
    val pairingStatusLabel: String,
    val syncStatusLabel: String,
    val languageCode: String,
    val pairCode: String,
    val sessionUri: String,
    val waitingTeacher: Boolean,
    val safeModeActive: Boolean,
    val safeModeReason: String?,
    val lastErrorTitle: String?,
    val lastErrorMessage: String?,
    val studentCanResolve: Boolean,
    val autoRetryPlanned: Boolean,
    val promptTitle: String?,
    val promptBody: String?,
    val promptOptions: String?,
    val promptExpectedAnswer: String?,
    val promptCountdownSeconds: Int?,
    val studentModeLabel: String,
    val deviceModeLabel: String,
    val executionModeLabel: String,
    val baseLocationName: String,
    val routePreviewCsv: String?,
    val allowVoice: Boolean,
    val allowButtons: Boolean,
    val allowTouch: Boolean,
    val lastUpdatedAt: Long,
)

@Entity(
    tableName = "queue_commands",
    indices = [Index("missionId"), Index("status")],
)
data class QueueCommandEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val missionId: String,
    val commandIndex: Int,
    val commandType: String,
    val title: String,
    val primaryValue: String?,
    val secondaryValue: String?,
    val tertiaryValue: String?,
    val optionsCsv: String?,
    val status: String,
    val requiresTeacherApproval: Boolean,
    val retryCount: Int,
    val blockingReason: String?,
    val createdAt: Long,
    val updatedAt: Long,
)

@Entity(tableName = "map_locations")
data class MapLocationEntity(
    @PrimaryKey val name: String,
    val floorLabel: String,
    val available: Boolean,
    val detail: String?,
    val lastValidatedAt: Long,
)

@Entity(
    tableName = "safety_incidents",
    indices = [Index("status"), Index("code")],
)
data class SafetyIncidentEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val code: String,
    val title: String,
    val details: String,
    val severity: String,
    val status: String,
    val teacherActionRequired: Boolean,
    val createdAt: Long,
    val updatedAt: Long,
)

@Dao
interface RobotDao {
    @Query("SELECT * FROM robot_snapshot WHERE id = 1")
    fun observeSnapshot(): Flow<RobotSnapshotEntity?>

    @Query("SELECT * FROM robot_snapshot WHERE id = 1")
    suspend fun getSnapshot(): RobotSnapshotEntity?

    @Upsert
    suspend fun upsertSnapshot(snapshot: RobotSnapshotEntity)

    @Query("SELECT * FROM queue_commands ORDER BY commandIndex ASC")
    fun observeQueue(): Flow<List<QueueCommandEntity>>

    @Query("SELECT * FROM queue_commands ORDER BY commandIndex ASC")
    suspend fun getQueue(): List<QueueCommandEntity>

    @Query("SELECT * FROM queue_commands WHERE status = 'PENDING' ORDER BY commandIndex ASC LIMIT 1")
    suspend fun getNextPendingCommand(): QueueCommandEntity?

    @Query("SELECT * FROM queue_commands WHERE status = 'WAITING_INPUT' ORDER BY commandIndex ASC LIMIT 1")
    suspend fun getWaitingPromptCommand(): QueueCommandEntity?

    @Query("SELECT * FROM queue_commands WHERE id = :commandId")
    suspend fun getQueueCommand(commandId: Long): QueueCommandEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertQueue(commands: List<QueueCommandEntity>)

    @Upsert
    suspend fun upsertQueueCommand(command: QueueCommandEntity)

    @Query("DELETE FROM queue_commands")
    suspend fun clearQueue()

    @Query("SELECT * FROM map_locations ORDER BY name ASC")
    fun observeLocations(): Flow<List<MapLocationEntity>>

    @Query("SELECT * FROM map_locations ORDER BY name ASC")
    suspend fun getLocations(): List<MapLocationEntity>

    @Upsert
    suspend fun upsertLocations(locations: List<MapLocationEntity>)

    @Query("DELETE FROM map_locations")
    suspend fun clearLocations()

    @Query("SELECT * FROM safety_incidents ORDER BY createdAt DESC")
    fun observeIncidents(): Flow<List<SafetyIncidentEntity>>

    @Query("SELECT * FROM safety_incidents WHERE status = 'OPEN' ORDER BY createdAt DESC")
    suspend fun getOpenIncidents(): List<SafetyIncidentEntity>

    @Upsert
    suspend fun upsertIncident(incident: SafetyIncidentEntity)

    @Query("DELETE FROM safety_incidents")
    suspend fun clearIncidents()

    @Query("UPDATE safety_incidents SET status = 'RESOLVED', updatedAt = :updatedAt WHERE status = 'OPEN'")
    suspend fun resolveOpenIncidents(updatedAt: Long)

    @Transaction
    suspend fun replaceQueue(commands: List<QueueCommandEntity>) {
        clearQueue()
        if (commands.isNotEmpty()) {
            insertQueue(commands)
        }
    }

    @Transaction
    suspend fun replaceLocations(locations: List<MapLocationEntity>) {
        clearLocations()
        if (locations.isNotEmpty()) {
            upsertLocations(locations)
        }
    }
}

@Database(
    entities = [
        RobotSnapshotEntity::class,
        QueueCommandEntity::class,
        MapLocationEntity::class,
        SafetyIncidentEntity::class,
    ],
    version = 3,
    exportSchema = true,
)
abstract class RobotDatabase : RoomDatabase() {
    abstract fun robotDao(): RobotDao
}
