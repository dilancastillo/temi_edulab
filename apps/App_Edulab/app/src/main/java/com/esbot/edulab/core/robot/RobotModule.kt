package com.esbot.edulab.core.robot

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RobotModule {

    @Provides
    @Singleton
    fun provideBatteryStatusProvider(
        @ApplicationContext context: Context
    ): BatteryStatusProvider = TemiBatteryObserver(context)

    @Provides
    @Singleton
    fun provideLocationServer(server: TemiLocationServer): LocationServer = server

    @Provides
    @Singleton
    fun provideRobotCommandRunner(runner: RobotReflectionRunner): RobotCommandRunner = runner
}
