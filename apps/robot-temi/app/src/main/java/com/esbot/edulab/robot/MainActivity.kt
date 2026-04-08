package com.esbot.edulab.robot

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.viewmodel.compose.viewModel
import com.esbot.edulab.robot.ui.RobotApp
import com.esbot.edulab.robot.ui.RobotViewModel
import com.esbot.edulab.robot.ui.theme.RobotTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val container = (application as RobotApplication).container

        setContent {
            RobotTheme {
                RobotApp(
                    viewModel = viewModel(
                        factory = RobotViewModel.Factory(container),
                    ),
                )
            }
        }
    }
}
