package com.esbot.edulab.robot.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.BatteryChargingFull
import androidx.compose.material.icons.rounded.BatteryFull
import androidx.compose.material.icons.rounded.QrCode2
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Wifi
import androidx.compose.material.icons.rounded.WifiOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.esbot.edulab.robot.ui.theme.RobotAccent
import com.esbot.edulab.robot.ui.theme.RobotBackground
import com.esbot.edulab.robot.ui.theme.RobotDanger
import com.esbot.edulab.robot.ui.theme.RobotPrimary
import com.esbot.edulab.robot.ui.theme.RobotReady
import com.esbot.edulab.robot.ui.theme.RobotSurface
import com.esbot.edulab.robot.ui.theme.RobotSurfaceAlt
import com.esbot.edulab.robot.ui.theme.RobotText
import com.esbot.edulab.robot.ui.theme.RobotTextMuted
import com.esbot.edulab.robot.ui.theme.RobotWarning

@Composable
fun RobotShell(
    uiState: RobotUiState,
    teacherControlsVisible: Boolean,
    onToggleTeacherControls: () -> Unit,
    onHideTeacherControls: () -> Unit,
    onTeacherApprove: () -> Unit,
    onPauseMission: () -> Unit,
    onForceSafeMode: () -> Unit,
    onReleaseSafeMode: () -> Unit,
    onRunDiagnostics: () -> Unit,
    onToggleLanguage: () -> Unit,
    onResetStandby: () -> Unit,
    onUpdateApiBaseUrl: (String) -> Unit,
    onRequestPairing: () -> Unit,
    onSyncNow: () -> Unit,
    body: @Composable ColumnScope.() -> Unit,
) {
    Box(
        modifier =
            Modifier
                .fillMaxSize()
                .background(RobotBackground),
    ) {
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Surface(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .pointerInput(teacherControlsVisible) {
                            detectTapGestures(onLongPress = { onToggleTeacherControls() })
                        },
                shape = RoundedCornerShape(8.dp),
                color = RobotSurfaceAlt,
            ) {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier =
                                Modifier
                                    .size(54.dp)
                                    .background(RobotPrimary, RoundedCornerShape(8.dp)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.School,
                                contentDescription = null,
                                tint = Color.White,
                            )
                        }
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(
                                text = "Temi EduLab",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = uiState.assignedRobotName,
                                style = MaterialTheme.typography.bodyMedium,
                                color = RobotTextMuted,
                            )
                        }
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        StatusPill(label = uiState.bannerLabel, tone = uiState.bannerTone)
                        HeaderMetric(
                            icon = if (uiState.connectionState == "CONNECTED") Icons.Rounded.Wifi else Icons.Rounded.WifiOff,
                            label = uiState.connectionState.localized(uiState.languageCode, "Conectado", "Connected"),
                        )
                        HeaderMetric(
                            icon = if (uiState.batteryCharging) Icons.Rounded.BatteryChargingFull else Icons.Rounded.BatteryFull,
                            label = "${uiState.batteryPercent}%",
                        )
                    }
                }
            }

            body()
        }

        if (teacherControlsVisible) {
            TeacherControlsOverlay(
                uiState = uiState,
                onDismiss = onHideTeacherControls,
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
            )
        }
    }
}

@Composable
fun StatusPill(label: String, tone: BannerTone) {
    val background =
        when (tone) {
            BannerTone.Ready -> RobotReady
            BannerTone.Warning -> RobotWarning
            BannerTone.Critical -> RobotDanger
            BannerTone.Active -> RobotAccent
        }
    Box(
        modifier =
            Modifier
                .background(background, RoundedCornerShape(999.dp))
                .padding(horizontal = 18.dp, vertical = 10.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = Color.White,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
fun SectionCard(
    modifier: Modifier = Modifier,
    title: String,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = RobotSurface),
        shape = RoundedCornerShape(8.dp),
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = RobotTextMuted,
                    )
                }
            }
            content()
        }
    }
}

@Composable
fun HeaderMetric(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = RobotTextMuted)
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = RobotTextMuted,
        )
    }
}

@Composable
fun MetricTile(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = RobotSurfaceAlt,
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = RobotTextMuted,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
fun PseudoQrCard(pairCode: String, sessionUri: String) {
    SectionCard(
        title = "Conexion del aula",
        subtitle = pairCode,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier =
                    Modifier
                        .size(140.dp)
                        .background(Color.White, RoundedCornerShape(8.dp))
                        .padding(12.dp),
                contentAlignment = Alignment.Center,
            ) {
                PseudoQr(code = sessionUri)
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Rounded.QrCode2,
                        contentDescription = null,
                        tint = RobotTextMuted,
                    )
                    Text(
                        text = "Codigo corto: $pairCode",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
                Text(
                    text = sessionUri,
                    style = MaterialTheme.typography.bodySmall,
                    color = RobotTextMuted,
                )
            }
        }
    }
}

@Composable
fun TeacherControlsOverlay(
    uiState: RobotUiState,
    onDismiss: () -> Unit,
    onTeacherApprove: () -> Unit,
    onPauseMission: () -> Unit,
    onForceSafeMode: () -> Unit,
    onReleaseSafeMode: () -> Unit,
    onRunDiagnostics: () -> Unit,
    onToggleLanguage: () -> Unit,
    onResetStandby: () -> Unit,
    onUpdateApiBaseUrl: (String) -> Unit,
    onRequestPairing: () -> Unit,
    onSyncNow: () -> Unit,
) {
    var apiBaseUrl by rememberSaveable(uiState.apiBaseUrl) { mutableStateOf(uiState.apiBaseUrl) }

    Box(
        modifier =
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f))
                .padding(24.dp),
        contentAlignment = Alignment.TopEnd,
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = RobotSurface),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.width(360.dp),
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "Panel docente",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = uiState.classroomName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = RobotTextMuted,
                )
                OutlinedTextField(
                    value = apiBaseUrl,
                    onValueChange = { apiBaseUrl = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("URL del backend") },
                    supportingText = { Text("Usa la IP o dominio donde corre la API. Ejemplo: http://192.168.1.40:4000") },
                )
                Text(
                    text = "Vinculacion: ${uiState.pairingStatusLabel}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = RobotTextMuted,
                )
                Text(
                    text = "Sync: ${uiState.syncStatusLabel}",
                    style = MaterialTheme.typography.bodySmall,
                    color = RobotTextMuted,
                )
                Button(
                    onClick = {
                        onUpdateApiBaseUrl(apiBaseUrl)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = RobotAccent),
                ) {
                    Text("Guardar URL")
                }
                OutlinedButton(
                    onClick = {
                        onRequestPairing()
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Crear codigo de vinculacion")
                }
                OutlinedButton(
                    onClick = {
                        onSyncNow()
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Sincronizar ahora")
                }
                Button(
                    onClick = {
                        onTeacherApprove()
                        onDismiss()
                    },
                    enabled = uiState.waitingTeacher,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = RobotPrimary),
                ) {
                    Text("Aprobar inicio")
                }
                OutlinedButton(
                    onClick = {
                        onPauseMission()
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Pausar mision")
                }
                OutlinedButton(
                    onClick = {
                        onRunDiagnostics()
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Diagnosticar mapa")
                }
                OutlinedButton(
                    onClick = {
                        onToggleLanguage()
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (uiState.languageCode == "es") "Switch to English" else "Cambiar a espanol")
                }
                Button(
                    onClick = {
                        if (uiState.safeModeActive) {
                            onReleaseSafeMode()
                        } else {
                            onForceSafeMode()
                        }
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors =
                        ButtonDefaults.buttonColors(
                            containerColor = if (uiState.safeModeActive) RobotReady else RobotDanger,
                        ),
                ) {
                    Text(if (uiState.safeModeActive) "Liberar modo seguro" else "Forzar modo seguro")
                }
                OutlinedButton(
                    onClick = {
                        onResetStandby()
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Volver a standby")
                }
                Text(
                    text = "Long press en la barra superior para abrir o cerrar este panel.",
                    style = MaterialTheme.typography.bodySmall,
                    color = RobotTextMuted,
                    textAlign = TextAlign.Start,
                )
            }
        }
    }
}

@Composable
fun PseudoQr(code: String) {
    val matrix =
        List(21) { row ->
            List(21) { column ->
                qrCell(code, row, column)
            }
        }
    Canvas(modifier = Modifier.fillMaxSize()) {
        val cell = size.minDimension / matrix.size
        matrix.forEachIndexed { row, values ->
            values.forEachIndexed { column, active ->
                if (active) {
                    drawRect(
                        color = Color.Black,
                        topLeft = Offset(column * cell, row * cell),
                        size = androidx.compose.ui.geometry.Size(cell, cell),
                    )
                }
            }
        }
    }
}

private fun qrCell(code: String, row: Int, column: Int): Boolean {
    if (isFinderSquare(row, column, 0, 0) ||
        isFinderSquare(row, column, 0, 14) ||
        isFinderSquare(row, column, 14, 0)
    ) {
        return true
    }
    val hash = code.hashCode()
    val seed = hash xor (row * 131) xor (column * 17)
    return seed and 1 == 0
}

private fun isFinderSquare(row: Int, column: Int, rowStart: Int, colStart: Int): Boolean {
    return row in rowStart until rowStart + 7 &&
        column in colStart until colStart + 7 &&
        (row == rowStart ||
            row == rowStart + 6 ||
            column == colStart ||
            column == colStart + 6 ||
            (row in rowStart + 2..rowStart + 4 && column in colStart + 2..colStart + 4))
}

private fun String.localized(languageCode: String, es: String, en: String): String {
    return if (this == "CONNECTED") {
        if (languageCode == "es") es else en
    } else {
        if (languageCode == "es") "Sin conexion" else "Offline"
    }
}
