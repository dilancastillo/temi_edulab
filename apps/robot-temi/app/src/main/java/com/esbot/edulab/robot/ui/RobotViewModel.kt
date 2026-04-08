package com.esbot.edulab.robot.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.esbot.edulab.robot.di.AppContainer
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

class RobotViewModel(
    private val container: AppContainer,
) : ViewModel() {
    val uiState =
        container.repository.store
            .map(RobotUiState.Companion::fromStore)
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5_000),
                initialValue = RobotUiState.preview(),
            )

    init {
        container.runtimeEngine.boot()
    }

    fun onStartClass() = container.runtimeEngine.startClassSession()

    fun onTeacherApprove() = container.runtimeEngine.approveTeacherGate()

    fun onPauseMission() = container.runtimeEngine.pauseMission()

    fun onRetryError() = container.runtimeEngine.retryLastError()

    fun onPromptAnswer(choice: String) = container.runtimeEngine.answerPrompt(choice)

    fun onRepeatInstruction() = container.runtimeEngine.repeatInstruction()

    fun onToggleLanguage() = container.runtimeEngine.toggleLanguage()

    fun onTeacherHelp() = container.runtimeEngine.requestTeacherHelp()

    fun onForceSafeMode() = container.runtimeEngine.forceSafeMode()

    fun onReleaseSafeMode() = container.runtimeEngine.releaseSafeMode()

    fun onRunDiagnostics() = container.runtimeEngine.runDiagnostics()

    fun onResetStandby() = container.runtimeEngine.resetToStandby()

    class Factory(
        private val container: AppContainer,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return RobotViewModel(container) as T
        }
    }
}
