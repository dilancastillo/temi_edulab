package com.esbot.edulab.robot.di

import android.content.Context
import androidx.room.Room
import com.esbot.edulab.robot.data.local.RobotDatabase
import com.esbot.edulab.robot.data.repository.RobotRepository
import com.esbot.edulab.robot.runtime.MissionRuntimeEngine
import com.esbot.edulab.robot.runtime.TemiReflectionBridge
import com.esbot.edulab.robot.sync.RobotSyncApi
import com.esbot.edulab.robot.sync.RobotSyncCoordinator
import com.esbot.edulab.robot.sync.RobotSyncPreferencesStore

class AppContainer(context: Context) {
    private val appContext = context.applicationContext

    val database: RobotDatabase =
        Room.databaseBuilder(
            appContext,
            RobotDatabase::class.java,
            "robot-temi.db",
        ).fallbackToDestructiveMigration().build()

    val bridge = TemiReflectionBridge(appContext)
    val repository = RobotRepository(database.robotDao(), bridge)
    val runtimeEngine = MissionRuntimeEngine(repository, bridge)
    val syncPreferencesStore = RobotSyncPreferencesStore(appContext)
    val syncCoordinator = RobotSyncCoordinator(repository, runtimeEngine, syncPreferencesStore, RobotSyncApi())
}
