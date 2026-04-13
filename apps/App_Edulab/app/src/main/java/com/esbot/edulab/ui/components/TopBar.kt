package com.esbot.edulab.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.esbot.edulab.R

@Composable
fun EsbotTopBar(
    currentTime: String,
    isConnected: Boolean,
    batteryPercentage: Int?,
    isCharging: Boolean,
    currentLanguageCode: String,
    onMenuClick: () -> Unit,
    onLanguageClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 32.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onMenuClick) {
            Icon(
                Icons.Default.Menu,
                contentDescription = stringResource(R.string.menu_description),
                modifier = Modifier.size(32.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        Icon(
            Icons.Default.Schedule,
            contentDescription = null,
            modifier = Modifier.size(28.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = currentTime, fontWeight = FontWeight.Medium, fontSize = 20.sp)

        Spacer(modifier = Modifier.width(20.dp))

        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .clickable(onClick = onLanguageClick)
                .padding(horizontal = 10.dp, vertical = 6.dp)
        ) {
            Icon(
                Icons.Default.Language,
                contentDescription = stringResource(R.string.language_description),
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(text = currentLanguageCode, fontWeight = FontWeight.Medium, fontSize = 20.sp)
        }

        Spacer(modifier = Modifier.weight(1f))

        BatteryIndicator(batteryPercentage = batteryPercentage, isCharging = isCharging)

        Spacer(modifier = Modifier.width(20.dp))

        ConnectionBadge(isConnected = isConnected)

        Spacer(modifier = Modifier.width(28.dp))

        Text(
            text = "Esbot EduLab",
            fontWeight = FontWeight.Bold,
            color = Color(0xFF1A237E),
            fontSize = 22.sp
        )
    }
}

@Composable
fun BatteryIndicator(batteryPercentage: Int?, isCharging: Boolean) {

    val icon: ImageVector = when {
        batteryPercentage == null -> Icons.Default.Battery0Bar
        isCharging -> Icons.Default.BatteryChargingFull
        batteryPercentage <= 20 -> Icons.Default.Battery0Bar
        batteryPercentage <= 40 -> Icons.Default.Battery2Bar
        batteryPercentage <= 60 -> Icons.Default.Battery3Bar
        batteryPercentage <= 80 -> Icons.Default.Battery5Bar
        else -> Icons.Default.BatteryFull
    }

    val tint = when {
        batteryPercentage == null -> Color.LightGray
        isCharging -> Color(0xFF4CAF50)
        batteryPercentage <= 20 -> Color(0xFFF44336)
        batteryPercentage <= 40 -> Color(0xFFFF9800)
        else -> Color(0xFF4CAF50)
    }

    val text = batteryPercentage?.let { "$it%" } ?: "--"

    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(32.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = text, fontWeight = FontWeight.Medium, color = tint, fontSize = 20.sp)
    }
}

@Composable
fun ConnectionBadge(isConnected: Boolean) {
    val color = if (isConnected) Color(0xFF4CAF50) else Color(0xFFF44336)
    val text = if (isConnected)
        stringResource(R.string.status_connected)
    else
        stringResource(R.string.status_disconnected)

    Surface(
        shape = RoundedCornerShape(50),
        color = color.copy(alpha = 0.15f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.4f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(modifier = Modifier.size(12.dp).background(color, CircleShape))
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = text, color = color, fontWeight = FontWeight.SemiBold, fontSize = 20.sp)
        }
    }
}