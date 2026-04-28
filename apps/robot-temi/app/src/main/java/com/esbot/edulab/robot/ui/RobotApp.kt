package com.esbot.edulab.robot.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun RobotApp(viewModel: RobotViewModel) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var teacherControlsVisible by rememberSaveable { mutableStateOf(false) }

    RobotScreens(
        uiState = uiState,
        teacherControlsVisible = teacherControlsVisible,
        onToggleTeacherControls = { teacherControlsVisible = !teacherControlsVisible },
        onHideTeacherControls = { teacherControlsVisible = false },
        onStartClass = viewModel::onStartClass,
        onTeacherApprove = viewModel::onTeacherApprove,
        onPauseMission = viewModel::onPauseMission,
        onRetryError = viewModel::onRetryError,
        onPromptAnswer = viewModel::onPromptAnswer,
        onRepeatInstruction = viewModel::onRepeatInstruction,
        onToggleLanguage = viewModel::onToggleLanguage,
        onTeacherHelp = viewModel::onTeacherHelp,
        onForceSafeMode = viewModel::onForceSafeMode,
        onReleaseSafeMode = viewModel::onReleaseSafeMode,
        onRunDiagnostics = viewModel::onRunDiagnostics,
        onResetStandby = viewModel::onResetStandby,
        onUpdateApiBaseUrl = viewModel::onUpdateApiBaseUrl,
        onRequestPairing = viewModel::onRequestPairing,
        onSyncNow = viewModel::onSyncNow,
    )
}
