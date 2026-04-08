package com.esbot.edulab.robot.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.DirectionsWalk
import androidx.compose.material.icons.rounded.Help
import androidx.compose.material.icons.rounded.HourglassTop
import androidx.compose.material.icons.rounded.KeyboardVoice
import androidx.compose.material.icons.rounded.Map
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.SmartToy
import androidx.compose.material.icons.rounded.TouchApp
import androidx.compose.material.icons.rounded.Translate
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.esbot.edulab.robot.ui.theme.RobotAccent
import com.esbot.edulab.robot.ui.theme.RobotDanger
import com.esbot.edulab.robot.ui.theme.RobotPrimary
import com.esbot.edulab.robot.ui.theme.RobotReady
import com.esbot.edulab.robot.ui.theme.RobotSurfaceAlt
import com.esbot.edulab.robot.ui.theme.RobotTextMuted
import com.esbot.edulab.robot.ui.theme.RobotWarning

@Composable
fun RobotScreens(
    uiState: RobotUiState,
    teacherControlsVisible: Boolean,
    onToggleTeacherControls: () -> Unit,
    onHideTeacherControls: () -> Unit,
    onStartClass: () -> Unit,
    onTeacherApprove: () -> Unit,
    onPauseMission: () -> Unit,
    onRetryError: () -> Unit,
    onPromptAnswer: (String) -> Unit,
    onRepeatInstruction: () -> Unit,
    onToggleLanguage: () -> Unit,
    onTeacherHelp: () -> Unit,
    onForceSafeMode: () -> Unit,
    onReleaseSafeMode: () -> Unit,
    onRunDiagnostics: () -> Unit,
    onResetStandby: () -> Unit,
) {
    RobotShell(
        uiState = uiState,
        teacherControlsVisible = teacherControlsVisible,
        onToggleTeacherControls = onToggleTeacherControls,
        onHideTeacherControls = onHideTeacherControls,
        onTeacherApprove = onTeacherApprove,
        onPauseMission = onPauseMission,
        onForceSafeMode = onForceSafeMode,
        onReleaseSafeMode = onReleaseSafeMode,
        onRunDiagnostics = onRunDiagnostics,
        onToggleLanguage = onToggleLanguage,
        onResetStandby = onResetStandby,
    ) {
        when (uiState.surface) {
            RobotSurface.Standby -> StandbyScreen(uiState = uiState, onStartClass = onStartClass)
            RobotSurface.ClassInProgress ->
                ClassInProgressScreen(
                    uiState = uiState,
                    onTeacherApprove = onTeacherApprove,
                    onPauseMission = onPauseMission,
                    onResetStandby = onResetStandby,
                )

            RobotSurface.Execution -> ExecutionScreen(uiState = uiState)
            RobotSurface.Interaction ->
                InteractionScreen(
                    uiState = uiState,
                    onPromptAnswer = onPromptAnswer,
                    onRepeatInstruction = onRepeatInstruction,
                    onToggleLanguage = onToggleLanguage,
                )

            RobotSurface.Error ->
                ErrorScreen(
                    uiState = uiState,
                    onRetryError = onRetryError,
                    onTeacherHelp = onTeacherHelp,
                )

            RobotSurface.SafeMode ->
                SafeModeScreen(
                    uiState = uiState,
                    onReleaseSafeMode = onReleaseSafeMode,
                    onRunDiagnostics = onRunDiagnostics,
                    onTeacherHelp = onTeacherHelp,
                )
        }
    }
}

@Composable
private fun StandbyScreen(
    uiState: RobotUiState,
    onStartClass: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        SectionCard(
            modifier = Modifier.weight(1.2f).fillMaxHeight(),
            title = "Aula lista",
            subtitle = "Dispositivo preparado para clase",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text(
                    text = uiState.robotStatusLabel,
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "Robot asignado a ${uiState.classroomName} con estado visible para docente y estudiantes.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = RobotTextMuted,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricTile(label = "Clase actual", value = uiState.classroomName, modifier = Modifier.weight(1f))
                    MetricTile(label = "Docente", value = uiState.teacherName, modifier = Modifier.weight(1f))
                }
                Box(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(RobotSurfaceAlt)
                            .padding(20.dp),
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = uiState.bannerLabel,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = "Long press en la barra superior para abrir el panel oculto del docente.",
                            color = RobotTextMuted,
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = onStartClass,
                        modifier = Modifier.weight(1f).height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = RobotPrimary),
                    ) {
                        Text("Iniciar clase")
                    }
                    OutlinedButton(
                        onClick = {},
                        enabled = false,
                        modifier = Modifier.weight(1f).height(56.dp),
                    ) {
                        Text("Esperando docente")
                    }
                }
            }
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                MetricTile(label = "Conexion", value = uiState.connectionState.localized(uiState.languageCode), modifier = Modifier.weight(1f))
                MetricTile(label = "Bateria", value = "${uiState.batteryPercent}%", modifier = Modifier.weight(1f))
            }
            PseudoQrCard(pairCode = uiState.pairCode, sessionUri = uiState.sessionUri)
            SectionCard(
                title = "Diagnostico de mapa",
                subtitle = "Ubicaciones listas para misiones",
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    uiState.locations.ifEmpty {
                        listOf(RobotLocationUi(name = "Sin ubicaciones", detail = "Ejecuta un diagnostico", available = false))
                    }.forEach { location ->
                        LocationRow(location)
                    }
                }
            }
        }
    }
}

@Composable
private fun ClassInProgressScreen(
    uiState: RobotUiState,
    onTeacherApprove: () -> Unit,
    onPauseMission: () -> Unit,
    onResetStandby: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Column(
            modifier = Modifier.weight(1.1f),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            SectionCard(
                title = "Clase en progreso",
                subtitle = uiState.activeMissionName ?: "Sin mision activa",
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        MetricTile(label = "Clase", value = uiState.classroomName, modifier = Modifier.weight(1f))
                        MetricTile(label = "Docente", value = uiState.teacherName, modifier = Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        MetricTile(label = "Equipo en turno", value = uiState.activeStudentName ?: "Pendiente", modifier = Modifier.weight(1f))
                        MetricTile(label = "Estado robot", value = uiState.robotStatusLabel, modifier = Modifier.weight(1f))
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Progreso de mision", style = MaterialTheme.typography.labelLarge, color = RobotTextMuted)
                        LinearProgressIndicator(progress = uiState.progressPercent / 100f, modifier = Modifier.fillMaxWidth().height(10.dp))
                        Text("${uiState.progressPercent}%", style = MaterialTheme.typography.titleSmall)
                    }
                }
            }

            SectionCard(
                title = "Cola local",
                subtitle = "Runtime almacenado en el robot",
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    uiState.queuePreview.ifEmpty { listOf("Sin pasos pendientes") }.forEachIndexed { index, item ->
                        Text("${index + 1}. $item", style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        }

        SectionCard(
            modifier = Modifier.weight(0.9f).fillMaxHeight(),
            title = "Interaccion del aula",
            subtitle = if (uiState.waitingTeacher) "Esperando aprobacion" else "Sesion activa",
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(
                        imageVector = if (uiState.waitingTeacher) Icons.Rounded.HourglassTop else Icons.Rounded.CheckCircle,
                        contentDescription = null,
                        tint = if (uiState.waitingTeacher) RobotWarning else RobotReady,
                    )
                    Text(
                        text =
                            if (uiState.waitingTeacher) {
                                "El robot esta esperando que el docente autorice el runtime."
                            } else {
                                "La clase ya esta corriendo y el siguiente flujo visible cambiara segun la mision."
                            },
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = if (uiState.waitingTeacher) onTeacherApprove else onPauseMission,
                        modifier = Modifier.fillMaxWidth().height(58.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = RobotPrimary),
                    ) {
                        Text(if (uiState.waitingTeacher) "Aprobar inicio de mision" else "Pausar mision")
                    }
                    OutlinedButton(
                        onClick = onResetStandby,
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                    ) {
                        Text("Cerrar sesion del aula")
                    }
                }
            }
        }
    }
}

@Composable
private fun ExecutionScreen(uiState: RobotUiState) {
    Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        SectionCard(
            modifier = Modifier.weight(1.1f).fillMaxHeight(),
            title = uiState.activeMissionName ?: "Mision en ejecucion",
            subtitle = uiState.currentStepLabel,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                Box(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(RobotSurfaceAlt)
                            .padding(24.dp),
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = when {
                                    uiState.robotStatusLabel.contains("Naveg", ignoreCase = true) -> Icons.Rounded.DirectionsWalk
                                    uiState.robotStatusLabel.contains("Detec", ignoreCase = true) -> Icons.Rounded.Map
                                    else -> Icons.Rounded.SmartToy
                                },
                                contentDescription = null,
                                tint = RobotAccent,
                            )
                            Text(
                                text = uiState.robotStatusLabel,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                        Text(
                            text = narrationFor(uiState),
                            style = MaterialTheme.typography.bodyLarge,
                            color = RobotTextMuted,
                        )
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Paso actual", style = MaterialTheme.typography.labelLarge, color = RobotTextMuted)
                    Text(uiState.currentStepLabel ?: "Preparando siguiente paso", style = MaterialTheme.typography.titleLarge)
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Progreso", style = MaterialTheme.typography.labelLarge, color = RobotTextMuted)
                    LinearProgressIndicator(progress = uiState.progressPercent / 100f, modifier = Modifier.fillMaxWidth().height(10.dp))
                    Text("${uiState.progressPercent}%", style = MaterialTheme.typography.titleMedium)
                }

                if (uiState.robotStatusLabel.contains("Naveg", ignoreCase = true)) {
                    SafetyNotice(text = "Aviso de seguridad: el robot esta en movimiento. Mantener libre la trayectoria.")
                }
            }
        }

        Column(
            modifier = Modifier.weight(0.9f),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            MetricTile(label = "Equipo", value = uiState.activeStudentName ?: "Pendiente")
            MetricTile(label = "Clase", value = uiState.classroomName)
            SectionCard(
                title = "Estado visible",
                subtitle = "Mensajes que ven los estudiantes",
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    uiState.queuePreview.take(4).forEach { item ->
                        Text(item, style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        }
    }
}

@Composable
private fun InteractionScreen(
    uiState: RobotUiState,
    onPromptAnswer: (String) -> Unit,
    onRepeatInstruction: () -> Unit,
    onToggleLanguage: () -> Unit,
) {
    var answerText by rememberSaveable { mutableStateOf("") }
    val prompt = uiState.prompt

    Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        SectionCard(
            modifier = Modifier.weight(1.15f).fillMaxHeight(),
            title = prompt?.title ?: "Esperando respuesta",
            subtitle = prompt?.body,
        ) {
            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                SafetyNotice(text = "El robot esta esperando una respuesta del estudiante o del equipo.")
                Text(
                    text = "Puedes responder por botones grandes, por voz demo o por entrada tactil.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                prompt?.options.orEmpty().forEach { option ->
                    Button(
                        onClick = { onPromptAnswer(option) },
                        modifier = Modifier.fillMaxWidth().height(58.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = RobotPrimary),
                    ) {
                        Text(option)
                    }
                }
                OutlinedTextField(
                    value = answerText,
                    onValueChange = { answerText = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Respuesta por voz o tactil (demo)") },
                    supportingText = { Text("Escribe una respuesta y enviala como simulacion local.") },
                )
                Button(
                    onClick = {
                        if (answerText.isNotBlank()) {
                            onPromptAnswer(answerText)
                            answerText = ""
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = RobotAccent),
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.KeyboardVoice, contentDescription = null)
                        Text("Enviar respuesta")
                    }
                }
            }
        }

        SectionCard(
            modifier = Modifier.weight(0.85f).fillMaxHeight(),
            title = "Controles del estudiante",
            subtitle = "Accesibilidad y apoyo",
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricTile(label = "Temporizador", value = "${prompt?.countdownSeconds ?: 0}s")
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        SupportModeChip(icon = Icons.Rounded.KeyboardVoice, label = "Voz")
                        SupportModeChip(icon = Icons.Rounded.TouchApp, label = "Tactil")
                        SupportModeChip(icon = Icons.Rounded.CheckCircle, label = "Botones")
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = onRepeatInstruction,
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Refresh, contentDescription = null)
                            Text("Repetir instruccion")
                        }
                    }
                    OutlinedButton(
                        onClick = onToggleLanguage,
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Translate, contentDescription = null)
                            Text(if (uiState.languageCode == "es") "Switch to English" else "Cambiar a espanol")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ErrorScreen(
    uiState: RobotUiState,
    onRetryError: () -> Unit,
    onTeacherHelp: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        SectionCard(
            modifier = Modifier.weight(1.1f).fillMaxHeight(),
            title = uiState.lastErrorTitle ?: "Error recuperable",
            subtitle = "El robot explicara el problema antes de reanudar.",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Warning, contentDescription = null, tint = RobotWarning)
                    Text(
                        text = uiState.lastErrorMessage ?: "Sin detalle disponible.",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
                MetricTile(
                    label = "Puede resolverlo el estudiante",
                    value = if (uiState.studentCanResolve) "Si" else "No, llamar docente",
                )
                MetricTile(
                    label = "Robot intentara reanudar",
                    value = if (uiState.autoRetryPlanned) "Si" else "Solo al confirmar",
                )
            }
        }

        SectionCard(
            modifier = Modifier.weight(0.9f).fillMaxHeight(),
            title = "Acciones disponibles",
            subtitle = "Recuperacion guiada",
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SafetyNotice(
                        text =
                            if (uiState.studentCanResolve) {
                                "El estudiante puede intentar otra vez desde esta misma pantalla."
                            } else {
                                "Este problema requiere revision del docente o del operador."
                            },
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = onRetryError,
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = RobotPrimary),
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Refresh, contentDescription = null)
                            Text("Reintentar")
                        }
                    }
                    OutlinedButton(
                        onClick = onTeacherHelp,
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Help, contentDescription = null)
                            Text("Pedir ayuda")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SafeModeScreen(
    uiState: RobotUiState,
    onReleaseSafeMode: () -> Unit,
    onRunDiagnostics: () -> Unit,
    onTeacherHelp: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        SectionCard(
            modifier = Modifier.weight(1.1f).fillMaxHeight(),
            title = "Modo seguro operativo",
            subtitle = uiState.safeModeReason,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Shield, contentDescription = null, tint = RobotDanger)
                    Text(
                        text = "Se bloquearon ejecuciones no aprobadas, navegacion incierta o comandos inseguros.",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    uiState.incidents.ifEmpty {
                        listOf(RobotIncidentUi(title = "Sin incidentes cargados", details = "El panel docente puede revisar el estado actual.", severity = "INFO"))
                    }.forEach { incident ->
                        IncidentRow(incident)
                    }
                }
            }
        }

        SectionCard(
            modifier = Modifier.weight(0.9f).fillMaxHeight(),
            title = "Reanudacion segura",
            subtitle = "Solo docente o admin",
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SafetyNotice(text = "Antes de liberar el modo seguro conviene validar mapa, permisos y ubicaciones.")
                }
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = onReleaseSafeMode,
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = RobotReady),
                    ) {
                        Text("Liberar modo seguro")
                    }
                    OutlinedButton(
                        onClick = onRunDiagnostics,
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Map, contentDescription = null)
                            Text("Diagnosticar mapa")
                        }
                    }
                    OutlinedButton(
                        onClick = onTeacherHelp,
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Help, contentDescription = null)
                            Text("Registrar ayuda docente")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SafetyNotice(text: String) {
    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .border(width = 1.dp, color = RobotWarning.copy(alpha = 0.6f), shape = RoundedCornerShape(8.dp))
                .padding(14.dp),
    ) {
        Text(text = text, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun LocationRow(location: RobotLocationUi) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(RobotSurfaceAlt)
                .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(location.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
            if (!location.detail.isNullOrBlank()) {
                Text(location.detail, style = MaterialTheme.typography.bodySmall, color = RobotTextMuted)
            }
        }
        Text(
            text = if (location.available) "Lista" else "No valida",
            color = if (location.available) RobotReady else RobotDanger,
            style = MaterialTheme.typography.labelLarge,
        )
    }
}

@Composable
private fun IncidentRow(incident: RobotIncidentUi) {
    val tone = if (incident.severity == "CRITICAL") RobotDanger else RobotWarning
    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(RobotSurfaceAlt)
                .border(1.dp, tone.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                .padding(14.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(incident.title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
            Text(incident.details, style = MaterialTheme.typography.bodySmall, color = RobotTextMuted)
        }
    }
}

@Composable
private fun SupportModeChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color.Transparent,
        modifier = Modifier.border(1.dp, RobotAccent.copy(alpha = 0.55f), RoundedCornerShape(8.dp)),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, contentDescription = null, tint = RobotAccent)
            Text(label, style = MaterialTheme.typography.labelLarge)
        }
    }
}

private fun String.localized(languageCode: String): String {
    return if (this == "CONNECTED") {
        if (languageCode == "es") "Conectado" else "Connected"
    } else {
        if (languageCode == "es") "Sin conexion" else "Offline"
    }
}

private fun narrationFor(uiState: RobotUiState): String {
    return when {
        uiState.robotStatusLabel.contains("Naveg", ignoreCase = true) ->
            if (uiState.languageCode == "es") "Voy a ${uiState.currentStepLabel?.removePrefix("Ir a ") ?: "la ubicacion indicada"}." else "I am heading to the next location."
        uiState.robotStatusLabel.contains("Habl", ignoreCase = true) ->
            if (uiState.languageCode == "es") "Estoy explicando el siguiente paso de la mision." else "I am explaining the next mission step."
        uiState.robotStatusLabel.contains("Detec", ignoreCase = true) ->
            if (uiState.languageCode == "es") "Estoy detectando el marcador para validar el entorno." else "I am detecting the marker to validate the environment."
        else ->
            if (uiState.languageCode == "es") "Estoy ejecutando la mision asignada." else "I am executing the assigned mission."
    }
}
