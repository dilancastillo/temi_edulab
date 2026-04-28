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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoStories
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.DirectionsWalk
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Help
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Map
import androidx.compose.material.icons.rounded.PlayCircle
import androidx.compose.material.icons.rounded.Science
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
    onUpdateApiBaseUrl: (String) -> Unit,
    onRequestPairing: () -> Unit,
    onSyncNow: () -> Unit,
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
        onUpdateApiBaseUrl = onUpdateApiBaseUrl,
        onRequestPairing = onRequestPairing,
        onSyncNow = onSyncNow,
    ) {
        when (uiState.surface) {
            RobotSurface.Standby -> StandbyScreen(uiState = uiState, onStartClass = onStartClass)
            RobotSurface.ClassInProgress -> ClassInProgressScreen(uiState = uiState, onTeacherApprove = onTeacherApprove, onPauseMission = onPauseMission, onResetStandby = onResetStandby)
            RobotSurface.Execution -> ExecutionScreen(uiState = uiState)
            RobotSurface.Interaction -> InteractionScreen(uiState = uiState, onPromptAnswer = onPromptAnswer, onRepeatInstruction = onRepeatInstruction, onToggleLanguage = onToggleLanguage)
            RobotSurface.Error -> ErrorScreen(uiState = uiState, onRetryError = onRetryError, onTeacherHelp = onTeacherHelp)
            RobotSurface.SafeMode -> SafeModeScreen(uiState = uiState, onReleaseSafeMode = onReleaseSafeMode, onRunDiagnostics = onRunDiagnostics, onTeacherHelp = onTeacherHelp)
        }
    }
}

@Composable
private fun StandbyScreen(uiState: RobotUiState, onStartClass: () -> Unit) {
    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        SectionCard(modifier = Modifier.weight(1.2f).fillMaxHeight(), title = "Temi listo para el taller", subtitle = uiState.assignedRobotName) {
            BigMissionBanner(
                title = "Temi guia mi salon",
                body = uiState.currentActionHint ?: "Todo esta listo para empezar la clase.",
                icon = Icons.Rounded.SmartToy,
                tone = RobotPrimary,
            )
            RoutePreviewRow(route = uiState.routePreview, baseLocationName = uiState.baseLocationName)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricTile(label = "Clase", value = uiState.classroomName, modifier = Modifier.weight(1f))
                MetricTile(label = "Docente", value = uiState.teacherName, modifier = Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricTile(label = "Modo", value = uiState.studentModeLabel, modifier = Modifier.weight(1f))
                MetricTile(label = "Dispositivos", value = uiState.deviceModeLabel, modifier = Modifier.weight(1f))
            }
            Button(onClick = onStartClass, modifier = Modifier.fillMaxWidth().height(64.dp), colors = ButtonDefaults.buttonColors(containerColor = RobotPrimary)) {
                Text("Iniciar clase")
            }
            Text("Long press en la barra superior para abrir el panel del docente.", style = MaterialTheme.typography.bodyMedium, color = RobotTextMuted)
        }

        Column(modifier = Modifier.weight(0.95f), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            SectionCard(title = "Estado del robot", subtitle = "Preparado para recibir al curso") {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricTile(label = "Conexion", value = uiState.connectionState.localized(uiState.languageCode), modifier = Modifier.weight(1f))
                    MetricTile(label = "Bateria", value = "${uiState.batteryPercent}%", modifier = Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricTile(label = "Vinculacion", value = uiState.pairingStatusLabel, modifier = Modifier.weight(1f))
                    MetricTile(label = "Sync", value = uiState.syncStatusLabel, modifier = Modifier.weight(1f))
                }
                MetricTile(label = "Ejecucion", value = uiState.executionModeLabel)
                MetricTile(label = "Siguiente equipo", value = uiState.nextTurnName ?: "Pendiente")
            }
            PseudoQrCard(pairCode = uiState.pairCode, sessionUri = uiState.sessionUri)
            SectionCard(title = "Mapa del aula", subtitle = "Lugares disponibles en Temi") {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    uiState.locations.ifEmpty {
                        listOf(RobotLocationUi(name = "Sin ubicaciones", detail = "Corre un diagnostico desde el panel docente.", available = false))
                    }.forEach { location ->
                        LocationRow(location)
                    }
                }
            }
        }
    }
}

@Composable
private fun ClassInProgressScreen(uiState: RobotUiState, onTeacherApprove: () -> Unit, onPauseMission: () -> Unit, onResetStandby: () -> Unit) {
    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        SectionCard(modifier = Modifier.weight(1.2f).fillMaxHeight(), title = "Clase en progreso", subtitle = uiState.activeMissionName ?: "Sin mision activa") {
            BigMissionBanner(
                title = uiState.activeStudentName ?: "Esperando equipo",
                body = uiState.currentActionHint ?: "Temi espera la siguiente orden del taller.",
                icon = if (uiState.waitingTeacher) Icons.Rounded.PlayCircle else Icons.Rounded.Groups,
                tone = if (uiState.waitingTeacher) RobotWarning else RobotAccent,
            )
            RoutePreviewRow(route = uiState.routePreview, baseLocationName = uiState.baseLocationName)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricTile(label = "Sigue", value = uiState.nextTurnName ?: "Sin cola", modifier = Modifier.weight(1f))
                MetricTile(label = "Modo", value = uiState.studentModeLabel, modifier = Modifier.weight(1f))
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Progreso del recorrido", style = MaterialTheme.typography.labelLarge, color = RobotTextMuted)
                LinearProgressIndicator(progress = { uiState.progressPercent / 100f }, modifier = Modifier.fillMaxWidth().height(12.dp))
                Text("${uiState.progressPercent}%", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
        }

        SectionCard(modifier = Modifier.weight(0.9f).fillMaxHeight(), title = "Accion del aula", subtitle = if (uiState.waitingTeacher) "Aun no empieza" else "Temi ya esta listo") {
            Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    CalloutCard(
                        icon = if (uiState.waitingTeacher) Icons.Rounded.PlayCircle else Icons.Rounded.CheckCircle,
                        title = if (uiState.waitingTeacher) "Falta aprobar el inicio" else "El turno ya esta activo",
                        body = if (uiState.waitingTeacher) "Cuando el docente apruebe, Temi mostrara la pantalla para que el equipo comience." else "Temi puede seguir con el recorrido o quedar en pausa si el grupo necesita tiempo.",
                        color = if (uiState.waitingTeacher) RobotWarning else RobotReady,
                    )
                    MetricTile(label = "Estado del robot", value = uiState.robotStatusLabel)
                    MetricTile(label = "Base", value = uiState.baseLocationName)
                }
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = if (uiState.waitingTeacher) onTeacherApprove else onPauseMission, modifier = Modifier.fillMaxWidth().height(60.dp), colors = ButtonDefaults.buttonColors(containerColor = RobotPrimary)) {
                        Text(if (uiState.waitingTeacher) "Aprobar inicio" else "Pausar mision")
                    }
                    OutlinedButton(onClick = onResetStandby, modifier = Modifier.fillMaxWidth().height(54.dp)) {
                        Text("Cerrar sesion del aula")
                    }
                }
            }
        }
    }
}

@Composable
private fun ExecutionScreen(uiState: RobotUiState) {
    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        SectionCard(modifier = Modifier.weight(1.2f).fillMaxHeight(), title = uiState.activeMissionName ?: "Temi guia mi salon", subtitle = uiState.robotStatusLabel) {
            BigMissionBanner(
                title = uiState.currentStepLabel ?: "Temi sigue el recorrido",
                body = uiState.currentActionHint ?: "Temi esta ejecutando la siguiente accion del taller.",
                icon = if (uiState.robotStatusLabel.contains("camino", ignoreCase = true)) Icons.Rounded.DirectionsWalk else Icons.Rounded.SmartToy,
                tone = if (uiState.robotStatusLabel.contains("camino", ignoreCase = true)) RobotWarning else RobotAccent,
            )
            if (uiState.robotStatusLabel.contains("camino", ignoreCase = true)) {
                CalloutCard(
                    icon = Icons.Rounded.Warning,
                    title = "Temi se esta moviendo",
                    body = "Deja libre el camino y acompana al equipo con calma.",
                    color = RobotWarning,
                )
            }
            RoutePreviewRow(route = uiState.routePreview, baseLocationName = uiState.baseLocationName)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Avance del recorrido", style = MaterialTheme.typography.labelLarge, color = RobotTextMuted)
                LinearProgressIndicator(progress = { uiState.progressPercent / 100f }, modifier = Modifier.fillMaxWidth().height(12.dp))
                Text("${uiState.progressPercent}% completo", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
        }

        Column(modifier = Modifier.weight(0.85f), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            MetricTile(label = "Equipo actual", value = uiState.activeStudentName ?: "Pendiente")
            MetricTile(label = "Sigue", value = uiState.nextTurnName ?: "Sin cola")
            MetricTile(label = "Modo", value = uiState.studentModeLabel)
            SectionCard(title = "Proximos pasos", subtitle = "Resumen visible del runtime") {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    uiState.queuePreview.take(5).ifEmpty { listOf("Sin pasos pendientes") }.forEach { item ->
                        Text("- $item", style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        }
    }
}

@Composable
private fun InteractionScreen(uiState: RobotUiState, onPromptAnswer: (String) -> Unit, onRepeatInstruction: () -> Unit, onToggleLanguage: () -> Unit) {
    var answerText by rememberSaveable { mutableStateOf("") }
    val prompt = uiState.prompt

    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        SectionCard(modifier = Modifier.weight(1.15f).fillMaxHeight(), title = prompt?.title ?: "Tu turno", subtitle = uiState.activeStudentName ?: "Equipo del taller") {
            BigMissionBanner(
                title = prompt?.title ?: "Temi espera al equipo",
                body = prompt?.body ?: uiState.currentActionHint ?: "Toca la pantalla para seguir.",
                icon = Icons.Rounded.TouchApp,
                tone = RobotPrimary,
            )
            Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                prompt?.options.orEmpty().forEach { option ->
                    Button(onClick = { onPromptAnswer(option) }, modifier = Modifier.fillMaxWidth().height(72.dp), colors = ButtonDefaults.buttonColors(containerColor = RobotAccent)) {
                        Text(option, style = MaterialTheme.typography.titleMedium)
                    }
                }
                OutlinedTextField(
                    value = answerText,
                    onValueChange = { answerText = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Respuesta por voz o tacto") },
                    supportingText = { Text("Escribe una respuesta corta y enviala.") },
                )
                Button(
                    onClick = {
                        if (answerText.isNotBlank()) {
                            onPromptAnswer(answerText)
                            answerText = ""
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(60.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = RobotPrimary),
                ) {
                    Text("Enviar respuesta")
                }
            }
        }

        SectionCard(modifier = Modifier.weight(0.85f).fillMaxHeight(), title = "Ayudas del robot", subtitle = "Soporte para el equipo") {
            Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SupportModeRow(icon = Icons.Rounded.TouchApp, label = "Botones grandes")
                    SupportModeRow(icon = Icons.Rounded.SmartToy, label = "Voz y texto")
                    SupportModeRow(icon = Icons.Rounded.Translate, label = if (uiState.languageCode == "es") "Espanol activo" else "English active")
                }
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onClick = onRepeatInstruction, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                        Text("Repetir instruccion")
                    }
                    OutlinedButton(onClick = onToggleLanguage, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                        Text(if (uiState.languageCode == "es") "Switch to English" else "Cambiar a espanol")
                    }
                }
            }
        }
    }
}

@Composable
private fun ErrorScreen(uiState: RobotUiState, onRetryError: () -> Unit, onTeacherHelp: () -> Unit) {
    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        SectionCard(modifier = Modifier.weight(1.1f).fillMaxHeight(), title = uiState.lastErrorTitle ?: "Temi necesita ayuda", subtitle = "Error recuperable del recorrido") {
            CalloutCard(
                icon = Icons.Rounded.Warning,
                title = uiState.lastErrorTitle ?: "Algo salio mal",
                body = uiState.lastErrorMessage ?: "No hay detalle adicional.",
                color = RobotWarning,
            )
            MetricTile(label = "Puede resolverlo el estudiante", value = if (uiState.studentCanResolve) "Si" else "No")
            MetricTile(label = "Reintento automatico", value = if (uiState.autoRetryPlanned) "Si" else "No")
        }

        SectionCard(modifier = Modifier.weight(0.9f).fillMaxHeight(), title = "Que hacemos ahora", subtitle = "Recuperacion guiada") {
            Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                CalloutCard(
                    icon = Icons.Rounded.Help,
                    title = if (uiState.studentCanResolve) "Intentemos otra vez" else "Llamemos al docente",
                    body = if (uiState.studentCanResolve) "El equipo puede probar de nuevo desde esta pantalla." else "Este problema necesita una revision del docente o del operador.",
                    color = if (uiState.studentCanResolve) RobotAccent else RobotDanger,
                )
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = onRetryError, modifier = Modifier.fillMaxWidth().height(60.dp), colors = ButtonDefaults.buttonColors(containerColor = RobotPrimary)) {
                        Text("Reintentar")
                    }
                    OutlinedButton(onClick = onTeacherHelp, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                        Text("Pedir ayuda")
                    }
                }
            }
        }
    }
}

@Composable
private fun SafeModeScreen(uiState: RobotUiState, onReleaseSafeMode: () -> Unit, onRunDiagnostics: () -> Unit, onTeacherHelp: () -> Unit) {
    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        SectionCard(modifier = Modifier.weight(1.1f).fillMaxHeight(), title = "Modo seguro", subtitle = "Temi detuvo el recorrido para proteger al grupo") {
            BigMissionBanner(
                title = "Necesito que me revisen",
                body = uiState.safeModeReason ?: "Temi detecto un riesgo y paro antes de continuar.",
                icon = Icons.Rounded.Shield,
                tone = RobotDanger,
            )
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                uiState.incidents.ifEmpty {
                    listOf(RobotIncidentUi(title = "Sin incidentes cargados", details = "Corre un diagnostico antes de liberar el modo seguro.", severity = "INFO"))
                }.forEach { incident ->
                    IncidentRow(incident)
                }
            }
        }

        SectionCard(modifier = Modifier.weight(0.9f).fillMaxHeight(), title = "Acciones seguras", subtitle = "Solo docente o admin") {
            Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricTile(label = "Mapa", value = "${uiState.locations.count { it.available }} lugares listos")
                    MetricTile(label = "Clase", value = uiState.classroomName)
                }
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = onReleaseSafeMode, modifier = Modifier.fillMaxWidth().height(60.dp), colors = ButtonDefaults.buttonColors(containerColor = RobotReady)) {
                        Text("Liberar modo seguro")
                    }
                    OutlinedButton(onClick = onRunDiagnostics, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                        Text("Diagnosticar mapa")
                    }
                    OutlinedButton(onClick = onTeacherHelp, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                        Text("Registrar ayuda docente")
                    }
                }
            }
        }
    }
}

@Composable
private fun BigMissionBanner(title: String, body: String, icon: ImageVector, tone: Color) {
    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(tone.copy(alpha = 0.12f))
                .border(1.dp, tone.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                .padding(20.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier =
                    Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(tone),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = Color.White)
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(body, style = MaterialTheme.typography.bodyLarge, color = RobotTextMuted)
            }
        }
    }
}

@Composable
private fun RoutePreviewRow(route: List<String>, baseLocationName: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        RouteChip(icon = Icons.Rounded.PlayCircle, label = "Inicio")
        route.forEach { stop ->
            RouteChip(icon = iconForRoute(stop), label = stop)
        }
        RouteChip(icon = Icons.Rounded.Home, label = baseLocationName)
    }
}

@Composable
private fun RouteChip(icon: ImageVector, label: String) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = RobotSurfaceAlt,
        modifier = Modifier.border(1.dp, RobotPrimary.copy(alpha = 0.15f), RoundedCornerShape(999.dp)),
    ) {
        Row(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = RobotPrimary)
            Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun CalloutCard(icon: ImageVector, title: String, body: String, color: Color) {
    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(color.copy(alpha = 0.12f))
                .border(1.dp, color.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                .padding(16.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
            Icon(icon, contentDescription = null, tint = color)
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(body, style = MaterialTheme.typography.bodyLarge, color = RobotTextMuted)
            }
        }
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
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(iconForRoute(location.name), contentDescription = null, tint = RobotPrimary)
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(location.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
                if (!location.detail.isNullOrBlank()) {
                    Text(location.detail, style = MaterialTheme.typography.bodySmall, color = RobotTextMuted)
                }
            }
        }
        Text(
            text = if (location.available) "Listo" else "No valido",
            color = if (location.available) RobotReady else RobotDanger,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
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
                .background(tone.copy(alpha = 0.1f))
                .border(1.dp, tone.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                .padding(14.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(incident.title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
            Text(incident.details, style = MaterialTheme.typography.bodyMedium, color = RobotTextMuted)
        }
    }
}

@Composable
private fun SupportModeRow(icon: ImageVector, label: String) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(RobotSurfaceAlt)
                .padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = RobotAccent)
        Text(label, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
    }
}

private fun String.localized(languageCode: String): String {
    return if (this == "CONNECTED") {
        if (languageCode == "es") "Conectado" else "Connected"
    } else {
        if (languageCode == "es") "Sin conexion" else "Offline"
    }
}

private fun iconForRoute(label: String): ImageVector {
    return when {
        label.contains("bibli", ignoreCase = true) -> Icons.Rounded.AutoStories
        label.contains("labor", ignoreCase = true) -> Icons.Rounded.Science
        label.contains("base", ignoreCase = true) -> Icons.Rounded.Home
        label.contains("salon", ignoreCase = true) -> Icons.Rounded.Groups
        else -> Icons.Rounded.Map
    }
}
