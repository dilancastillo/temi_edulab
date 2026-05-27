package com.esbot.edulab

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import com.esbot.edulab.core.robot.BatteryStatusProvider
import com.esbot.edulab.core.robot.RobotWebSocketServer
import com.esbot.edulab.ui.home.HomeScreen
import com.esbot.edulab.ui.theme.EduLabAppTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject
    lateinit var batteryStatusProvider: BatteryStatusProvider
    @Inject
    lateinit var wsServer: RobotWebSocketServer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        wsServer.start()
        setContent {
            EduLabAppTheme {
                HomeScreen(
                    onLanguageClick = { languageTag ->
                        AppCompatDelegate.setApplicationLocales(
                            LocaleListCompat.forLanguageTags(languageTag)
                        )
                    }
                )
            }
        }
    }

    override fun onStart() {
        super.onStart()
        batteryStatusProvider.startObserving()
    }

    override fun onStop() {
        super.onStop()
        batteryStatusProvider.stopObserving()
    }
    override fun onDestroy() {  // ← NUEVO
        super.onDestroy()
        wsServer.stop()
    }
}
