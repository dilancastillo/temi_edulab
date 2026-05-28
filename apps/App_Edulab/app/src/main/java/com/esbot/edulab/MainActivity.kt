package com.esbot.edulab

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
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
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ),
                1001
            )
        }
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
