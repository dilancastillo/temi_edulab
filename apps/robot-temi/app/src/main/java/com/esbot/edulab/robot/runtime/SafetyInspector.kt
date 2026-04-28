package com.esbot.edulab.robot.runtime

import com.esbot.edulab.robot.data.local.MapLocationEntity
import com.esbot.edulab.robot.data.local.QueueCommandEntity
import com.esbot.edulab.robot.model.CommandType
import com.esbot.edulab.robot.model.QueueStatus
import com.esbot.edulab.robot.model.SafetyViolation

object SafetyInspector {
    fun inspect(
        queue: List<QueueCommandEntity>,
        locations: List<MapLocationEntity>,
        mapReady: Boolean,
    ): List<SafetyViolation> {
        val pending = queue.filter { it.status != QueueStatus.Done }
        val violations = mutableListOf<SafetyViolation>()
        val validLocations = locations.filter { it.available }
        val normalizedLocationNames = validLocations.map { it.name.normalizedLocationKey() }.toSet()

        if (!mapReady && pending.any { it.commandType == CommandType.Navigate }) {
            violations += SafetyViolation(
                code = "MAP_NOT_READY",
                title = "Mapa no disponible",
                details = "La mision requiere navegacion, pero el mapa no esta listo.",
            )
        }

        pending.filter { it.commandType == CommandType.Navigate }.forEach { command ->
            val target = command.primaryValue?.normalizedLocationKey()
            if (target.isNullOrBlank() || target !in normalizedLocationNames) {
                violations += SafetyViolation(
                    code = "INVALID_LOCATION",
                    title = "Ubicacion invalida",
                    details = "La ubicacion ${command.primaryValue ?: "sin nombre"} no existe o no esta validada.",
                )
            }
        }

        val stopNavigations =
            pending.filter {
                it.commandType == CommandType.Navigate &&
                    !it.title.contains("Volver", ignoreCase = true) &&
                    !it.primaryValue.isNullOrBlank()
            }
        val duplicatedStops =
            stopNavigations
                .groupBy { it.primaryValue?.normalizedLocationKey().orEmpty() }
                .filterKeys { it.isNotBlank() }
                .filterValues { commands -> commands.size > 1 }
        if (duplicatedStops.isNotEmpty()) {
            violations += SafetyViolation(
                code = "REPEATED_STOP",
                title = "Paradas repetidas",
                details = "El recorrido usa el mismo lugar mas de una vez y debe revisarse antes de ejecutarse.",
            )
        }

        pending.windowed(size = 3, step = 1, partialWindows = false).forEach { window ->
            if (window.all { it.commandType == CommandType.Navigate } &&
                window.map { it.primaryValue }.distinct().size == 1
            ) {
                violations += SafetyViolation(
                    code = "DUPLICATE_NAVIGATION",
                    title = "Comandos duplicados",
                    details = "Se detectaron navegaciones repetidas hacia la misma ubicacion.",
                )
            }
        }

        val loopRisk = pending
            .filter { it.commandType == CommandType.Navigate }
            .groupBy { it.primaryValue }
            .any { (_, commands) -> commands.size >= 4 }
        if (loopRisk) {
            violations += SafetyViolation(
                code = "LOOP_RISK",
                title = "Loop peligroso",
                details = "La cola contiene demasiadas navegaciones a la misma ubicacion.",
            )
        }

        return violations.distinctBy { it.code }
    }
}

private fun String.normalizedLocationKey(): String {
    return normalizeText(this)
}

private fun normalizeText(value: String): String {
    return java.text.Normalizer
        .normalize(value, java.text.Normalizer.Form.NFD)
        .replace("\\p{Mn}+".toRegex(), "")
        .trim()
        .lowercase()
}
