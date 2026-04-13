# Tareas de Implementación: temi-battery-indicator

## Fase 1: Dependencia del SDK de Temi

- [x] 1.1 Agregar la dependencia del SDK de Temi en `app/build.gradle.kts`
  - Añadir `implementation("com.robotemi:sdk:1.131.3")` en el bloque `dependencies`
  - Sincronizar Gradle y verificar que no hay errores de resolución

## Fase 2: Extensión del modelo de estado

- [x] 2.1 Agregar `batteryPercentage` e `isCharging` a `HomeUiState`
  - Añadir `val batteryPercentage: Int = 0` a la data class
  - Añadir `val isCharging: Boolean = false` a la data class
  - Verificar que los campos existentes (`isConnected`, `currentTime`) no se modifican

## Fase 3: Lógica de actualización en el ViewModel

- [x] 3.1 Implementar `updateBattery` en `HomeViewModel`
  - Añadir el método `fun updateBattery(percentage: Int, isCharging: Boolean)`
  - Validar que `percentage` esté en `[0, 100]`; si no, retornar sin modificar el estado
  - Actualizar `_uiState` con `copy(batteryPercentage = percentage, isCharging = isCharging)`

## Fase 4: Integración del listener en MainActivity

- [x] 4.1 Implementar `OnBatteryStatusChangedListener` en `MainActivity`
  - Añadir `implements OnBatteryStatusChangedListener` a la declaración de clase
  - Inyectar `HomeViewModel` mediante `private val viewModel: HomeViewModel by viewModels()`
  - Implementar `onBatteryStatusChanged(batteryData: BatteryData)` llamando a `viewModel.updateBattery()`
- [x] 4.2 Registrar y remover el listener según el ciclo de vida
  - En `onStart()`: llamar `Robot.getInstance()?.addOnBatteryStatusChangedListener(this)`
  - En `onStop()`: llamar `Robot.getInstance()?.removeOnBatteryStatusChangedListener(this)`

## Fase 5: Propagación de datos en la cadena de composables

- [x] 5.1 Actualizar `HomeScreen` para pasar los nuevos campos
  - Leer `uiState.batteryPercentage` y `uiState.isCharging`
  - Pasarlos como parámetros a `HomeScreenContent`
  - Actualizar el `@Preview` de `HomeScreenPreview` con valores de ejemplo
- [x] 5.2 Actualizar `HomeScreenContent` para recibir y propagar los nuevos parámetros
  - Añadir `batteryPercentage: Int` e `isCharging: Boolean` a la firma del composable
  - Pasarlos a `EsbotTopBar`

## Fase 6: Componente visual BatteryIndicator

- [x] 6.1 Añadir `BatteryIndicator` composable en `TopBar.kt`
  - Crear `@Composable fun BatteryIndicator(batteryPercentage: Int, isCharging: Boolean)`
  - Mostrar el texto `"$batteryPercentage%"` con `FontWeight.Medium`
  - Mostrar ícono de batería según el nivel (tabla de íconos del diseño)
  - Mostrar ícono `BatteryChargingFull` adicional cuando `isCharging == true`
- [x] 6.2 Integrar `BatteryIndicator` en `EsbotTopBar`
  - Añadir `batteryPercentage: Int` e `isCharging: Boolean` a la firma de `EsbotTopBar`
  - Colocar `BatteryIndicator` en el `Row` de `EsbotTopBar`, antes de `ConnectionBadge`
  - Añadir `Spacer` de separación apropiado

## Fase 7: Tests unitarios

- [x] 7.1 Agregar tests unitarios de `HomeViewModel` para `updateBattery`
  - `updateBattery(50, true)` actualiza `batteryPercentage = 50` e `isCharging = true`
  - `updateBattery(0, false)` actualiza correctamente (caso borde mínimo)
  - `updateBattery(100, true)` actualiza correctamente (caso borde máximo)
  - `updateBattery(-1, true)` no modifica el estado previo
  - `updateBattery(101, false)` no modifica el estado previo
  - `HomeUiState()` tiene `batteryPercentage = 0` e `isCharging = false` por defecto
  - `updateBattery` no afecta `isConnected` ni `currentTime`

## Fase 8: Tests de propiedades (Property-Based Testing)

- [x] 8.1 Agregar dependencia de Kotest Property Testing en `app/build.gradle.kts`
  - Añadir `testImplementation("io.kotest:kotest-property:5.9.1")`
- [x] 8.2 Implementar tests de propiedades para `HomeViewModel`
  - Propiedad 1: Para `percentage` en `[0, 100]` e `isCharging` aleatorio, el estado refleja ambos valores
    - `// Feature: temi-battery-indicator, Property 1: updateBattery con rango válido actualiza el estado`
  - Propiedad 2: Para `percentage` fuera de `[0, 100]`, el estado no cambia
    - `// Feature: temi-battery-indicator, Property 2: updateBattery con rango inválido no modifica el estado`
  - Propiedad 3: Para secuencia de llamadas, el estado final es el de la última llamada válida
    - `// Feature: temi-battery-indicator, Property 3: Secuencia de llamadas refleja el último valor válido`
- [ ] 8.3 Implementar tests de propiedades para `BatteryIndicator` (Compose UI tests)
  - Propiedad 4: Para `percentage` en `[0, 100]`, el texto renderizado contiene `"$percentage%"`
    - `// Feature: temi-battery-indicator, Property 4: BatteryIndicator muestra el porcentaje como texto`
  - Propiedad 5: Para `isCharging=true`, el árbol de composición contiene el ícono de carga
    - `// Feature: temi-battery-indicator, Property 5: BatteryIndicator muestra ícono de carga cuando isCharging es true`
  - Propiedad 6: Para cualquier par `(percentage, isCharging)`, `EsbotTopBar` refleja los valores
    - `// Feature: temi-battery-indicator, Property 6: Propagación reactiva de batería desde HomeUiState hasta EsbotTopBar`
