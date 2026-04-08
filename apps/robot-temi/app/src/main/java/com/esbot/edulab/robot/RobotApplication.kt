package com.esbot.edulab.robot

import android.app.Application
import com.esbot.edulab.robot.di.AppContainer

class RobotApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
