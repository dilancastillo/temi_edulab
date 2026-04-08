package com.esbot.edulab.robot.runtime

import com.esbot.edulab.robot.data.local.QueueCommandEntity
import com.esbot.edulab.robot.data.repository.RobotRepository
import com.esbot.edulab.robot.model.CommandType
import com.esbot.edulab.robot.model.RobotPhase
import com.esbot.edulab.robot.model.SafetyViolation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class MissionRuntimeEngine(
    private val repository: RobotRepository,
    private val bridge: RobotBridge,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val runtimeLock = Mutex()

    fun boot() {
        scope.launch {
            repository.seedIfNeeded()
            repository.refreshDiagnostics()
            bridge.hideTopBar(hidden = true)
        }
    }

    fun startClassSession() {
        scope.launch {
            repository.startClassSession()
        }
    }

    fun approveTeacherGate() {
        scope.launch {
            repository.approveTeacherStart()
            runRuntimeLoop()
        }
    }

    fun retryLastError() {
        scope.launch {
            val restoredInteraction = repository.restoreFromError()
            if (!restoredInteraction) {
                runRuntimeLoop()
            }
        }
    }

    fun answerPrompt(choice: String) {
        scope.launch {
            val prompt = repository.getWaitingPromptCommand() ?: return@launch
            val expected = prompt.tertiaryValue?.trim().orEmpty()
            if (choice.trim().equals(expected, ignoreCase = true)) {
                repository.resolveInteraction(choice)
                runRuntimeLoop()
            } else {
                repository.showRecoverableError(
                    title = "No pude entender la respuesta",
                    message = "Prueba otra vez o pide apoyo al docente para continuar la mision.",
                    studentCanResolve = true,
                    autoRetryPlanned = false,
                    commandId = prompt.id,
                )
            }
        }
    }

    fun repeatInstruction() {
        scope.launch {
            val snapshot = repository.currentSnapshot()
            val text = listOfNotNull(snapshot.promptTitle, snapshot.promptBody).joinToString(". ")
            if (text.isNotBlank()) {
                bridge.speak(text, snapshot.languageCode)
            }
        }
    }

    fun pauseMission() {
        scope.launch {
            bridge.stopMovement()
            repository.pauseMission()
        }
    }

    fun requestTeacherHelp() {
        scope.launch {
            repository.requestTeacherHelp()
        }
    }

    fun toggleLanguage() {
        scope.launch {
            repository.toggleLanguage()
        }
    }

    fun forceSafeMode(reason: String = "Bloqueo manual desde panel docente") {
        scope.launch {
            bridge.stopMovement()
            repository.enterSafeMode(
                SafetyViolation(
                    code = "MANUAL_SAFE_MODE",
                    title = "Modo seguro activado",
                    details = reason,
                ),
            )
        }
    }

    fun releaseSafeMode() {
        scope.launch {
            repository.releaseSafeMode()
        }
    }

    fun runDiagnostics() {
        scope.launch {
            repository.runMapDiagnostic()
        }
    }

    fun resetToStandby() {
        scope.launch {
            bridge.stopMovement()
            repository.clearQueueAndStandby()
        }
    }

    private suspend fun runRuntimeLoop() {
        runtimeLock.withLock {
            while (true) {
                repository.refreshDiagnostics()
                val snapshot = repository.currentSnapshot()
                if (snapshot.safeModeActive ||
                    snapshot.classPhase == RobotPhase.SafeMode ||
                    snapshot.classPhase == RobotPhase.Error ||
                    snapshot.waitingTeacher
                ) {
                    return
                }

                val queue = repository.currentQueue()
                val locations = repository.currentLocations()
                val safetyViolations = SafetyInspector.inspect(
                    queue = queue,
                    locations = locations,
                    mapReady = locations.any { it.available },
                )
                if (safetyViolations.isNotEmpty()) {
                    repository.enterSafeMode(safetyViolations.first())
                    return
                }

                val next = repository.getNextPendingCommand() ?: return
                when (next.commandType) {
                    CommandType.TeacherApproval -> {
                        repository.pauseMission("Esperando aprobacion del docente")
                        return
                    }

                    CommandType.Speak -> executeSpeak(next, snapshot.languageCode)
                    CommandType.Navigate -> executeNavigate(next, locations)
                    CommandType.WaitForChoice -> {
                        repository.markInteraction(next)
                        return
                    }

                    CommandType.Detect -> executeDetect(next, snapshot.languageCode)
                    CommandType.Complete -> {
                        repository.completeCommand(next.id)
                        repository.finishMission()
                        return
                    }
                }
            }
        }
    }

    private suspend fun executeSpeak(command: QueueCommandEntity, languageCode: String) {
        repository.activateCommand(command, statusLabel = if (languageCode == "es") "Hablando" else "Speaking")
        val result = bridge.speak(command.primaryValue.orEmpty(), languageCode)
        if (!result.success) {
            repository.showRecoverableError(
                title = "No pude hablar",
                message = result.message ?: "El motor de voz no esta listo en este momento.",
                studentCanResolve = false,
                autoRetryPlanned = true,
                commandId = command.id,
            )
            return
        }
        delay(350)
        repository.completeCommand(command.id)
    }

    private suspend fun executeNavigate(command: QueueCommandEntity, locations: List<com.esbot.edulab.robot.data.local.MapLocationEntity>) {
        val target = command.primaryValue.orEmpty()
        val resolvedLocation = locations.firstOrNull {
            it.available && it.name.equals(target, ignoreCase = true)
        }
        if (resolvedLocation == null) {
            repository.showRecoverableError(
                title = "No existe la ubicacion",
                message = "La mision apunta a una ubicacion no valida. Debe revisar el docente.",
                studentCanResolve = false,
                autoRetryPlanned = false,
                commandId = command.id,
            )
            return
        }
        repository.activateCommand(command, statusLabel = "Navegando")
        val result = bridge.goTo(resolvedLocation.name)
        if (!result.success) {
            repository.showRecoverableError(
                title = "No encontre la ubicacion",
                message = result.message ?: "El robot no pudo navegar a la ubicacion solicitada.",
                studentCanResolve = false,
                autoRetryPlanned = true,
                commandId = command.id,
            )
            return
        }
        delay(500)
        repository.completeCommand(command.id)
    }

    private suspend fun executeDetect(command: QueueCommandEntity, languageCode: String) {
        repository.activateCommand(command, statusLabel = if (languageCode == "es") "Detectando" else "Detecting")
        delay(1200)
        repository.completeCommand(command.id)
    }
}
