# Diseño Técnico: temi-battery-indicator

## Visión General

Esta feature integra el indicador de batería del robot Temi en la barra superior (`EsbotTopBar`) de la aplicación Android EduLab. El SDK de Temi expone el estado de batería mediante un listener basado en callbacks; el diseño conecta ese callback con el estado reactivo de Jetpack Compose a través del patrón MVVM ya establecido en el proyecto.

El flujo de datos es unidireccional:

```
SDK Temi (BatteryData)
    → MainActivity (OnBatteryStatusChangedListener)
        → HomeViewModel.updateBattery()
            → HomeUiState (StateFlow)
                → HomeScreen → HomeScreenContent → EsbotTopBar → BatteryIndicator
```

No se introduce ninguna capa nueva; todos los cambios se realizan sobre componentes existentes.

---

## Arquitectura

El proyecto sigue MVVM + DIP con Hilt como contenedor de inyección de dependencias. La integración del SDK de Temi se realiza en la capa de presentación (Activity/ViewModel) porque el SDK no es un repositorio de datos sino un proveedor de hardware con ciclo de vida propio.

```mermaid
graph TD
    SDK["SDK Temi\nRobot.getInstance()"]
    MA["MainActivity\nOnBatteryStatusChangedListener"]
    VM["HomeViewModel\nupdateBattery()"]
    STATE["HomeUiState\nbatteryPercentage, isCharging"]
    HS["HomeScreen\ncollectAsState()"]
    HSC["HomeScreenContent"]
    TB["EsbotTopBar\nBatteryIndicator"]

    SDK -->|onBatteryStatusChanged| MA
    MA -->|updateBattery(pct, charging)| VM
    VM -->|_uiState.update| STATE
    STATE -->|StateFlow| HS
    HS -->|props| HSC
    HSC -->|props| TB
```

### Decisiones de diseño

- **El listener vive en MainActivity, no en ViewModel**: El SDK de Temi requiere un contexto de Activity para `Robot.getInstance()` y su ciclo de vida (`onStart`/`onStop`) está ligado a la Activity. Colocar el listener en el ViewModel violaría la separación de responsabilidades y complicaría el testing.
- **`updateBattery` es un método público del ViewModel**: La Activity necesita llamarlo directamente. Dado que el ViewModel ya es accesible desde la Activity vía `viewModels()`, no se requiere ningún mecanismo adicional.
- **Validación en el ViewModel, no en la Activity**: La regla de negocio `0..100` pertenece al dominio del estado, no al transporte de datos.
- **`Robot.getInstance()` puede ser null**: En emuladores o dispositivos no-Temi el SDK retorna null. Se usa el operador `?.` para omitir la operación de forma segura.

---

## Componentes e Interfaces

### 1. `HomeUiState` (modificación)

```kotlin
data class HomeUiState(
    val isConnected: Boolean = false,
    val currentTime: String = "",
    val batteryPercentage: Int = 0,
    val isCharging: Boolean = false
)
```

### 2. `HomeViewModel` (modificación)

Nuevo método público:

```kotlin
fun updateBattery(percentage: Int, isCharging: Boolean) {
    if (percentage < 0 || percentage > 100) return
    _uiState.update { it.copy(batteryPercentage = percentage, isCharging = isCharging) }
}
```

### 3. `MainActivity` (modificación)

Implementa `OnBatteryStatusChangedListener` e inyecta el ViewModel:

```kotlin
@AndroidEntryPoint
class MainActivity : AppCompatActivity(), OnBatteryStatusChangedListener {

    private val viewModel: HomeViewModel by viewModels()

    override fun onStart() {
        super.onStart()
        Robot.getInstance()?.addOnBatteryStatusChangedListener(this)
    }

    override fun onStop() {
        super.onStop()
        Robot.getInstance()?.removeOnBatteryStatusChangedListener(this)
    }

    override fun onBatteryStatusChanged(batteryData: BatteryData) {
        viewModel.updateBattery(batteryData.batteryPercentage, batteryData.isCharging)
    }
}
```

### 4. `HomeScreen` (modificación)

Pasa los nuevos campos del estado a `HomeScreenContent`:

```kotlin
HomeScreenContent(
    isConnected = uiState.isConnected,
    currentTime = uiState.currentTime,
    batteryPercentage = uiState.batteryPercentage,
    isCharging = uiState.isCharging,
    currentLanguageCode = ...,
    onLanguageClick = { ... }
)
```

### 5. `HomeScreenContent` (modificación)

Recibe y propaga los nuevos parámetros:

```kotlin
@Composable
fun HomeScreenContent(
    isConnected: Boolean,
    currentTime: String,
    batteryPercentage: Int,
    isCharging: Boolean,
    currentLanguageCode: String,
    onLanguageClick: () -> Unit
)
```

### 6. `EsbotTopBar` (modificación) + `BatteryIndicator` (nuevo)

`EsbotTopBar` recibe `batteryPercentage` e `isCharging` y renderiza el nuevo composable `BatteryIndicator`:

```kotlin
@Composable
fun BatteryIndicator(batteryPercentage: Int, isCharging: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = batteryIcon(batteryPercentage),
            contentDescription = null
        )
        if (isCharging) {
            Icon(Icons.Default.BatteryChargingFull, contentDescription = null)
        }
        Spacer(modifier = Modifier.width(4.dp))
        Text(text = "$batteryPercentage%", fontWeight = FontWeight.Medium)
    }
}
```

El ícono de batería se selecciona según el nivel:

| Rango       | Ícono Material                  |
|-------------|----------------------------------|
| 0–20%       | `Battery0Bar`                   |
| 21–40%      | `Battery2Bar`                   |
| 41–60%      | `Battery3Bar`                   |
| 61–80%      | `Battery5Bar`                   |
| 81–100%     | `BatteryFull`                   |
| Cargando    | `BatteryChargingFull` (adicional)|

---

## Modelos de Datos

### `HomeUiState`

| Campo               | Tipo      | Valor por defecto | Descripción                                      |
|---------------------|-----------|-------------------|--------------------------------------------------|
| `isConnected`       | `Boolean` | `false`           | Estado de conectividad de red (existente)        |
| `currentTime`       | `String`  | `""`              | Hora actual formateada (existente)               |
| `batteryPercentage` | `Int`     | `0`               | Porcentaje de batería del robot Temi (nuevo)     |
| `isCharging`        | `Boolean` | `false`           | Indica si el robot está cargando (nuevo)         |

### Invariante de dominio

`batteryPercentage` siempre satisface `0 ≤ batteryPercentage ≤ 100`. Valores fuera de rango son rechazados por `updateBattery` antes de modificar el estado.

### `BatteryData` (SDK de Temi — solo lectura)

| Campo                | Tipo      | Descripción                          |
|----------------------|-----------|--------------------------------------|
| `batteryPercentage`  | `Int`     | Porcentaje de batería (0–100)        |
| `isCharging`         | `Boolean` | `true` si el robot está en carga     |

---

## Propiedades de Corrección

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas.*

---

### Propiedad 1: `updateBattery` con rango válido actualiza el estado

*Para cualquier* entero `percentage` en el rango `[0, 100]` y cualquier valor booleano `isCharging`, invocar `HomeViewModel.updateBattery(percentage, isCharging)` debe resultar en que `HomeUiState.batteryPercentage == percentage` y `HomeUiState.isCharging == isCharging`.

**Valida: Requisitos 4.2, 4.3, 4.4**

---

### Propiedad 2: `updateBattery` con rango inválido no modifica el estado

*Para cualquier* entero `percentage` fuera del rango `[0, 100]` (es decir, `percentage < 0` o `percentage > 100`), invocar `HomeViewModel.updateBattery(percentage, isCharging)` no debe modificar el valor previo de `HomeUiState.batteryPercentage`.

**Valida: Requisito 4.5**

---

### Propiedad 3: Secuencia de llamadas a `updateBattery` refleja el último valor válido

*Para cualquier* secuencia finita de llamadas a `updateBattery` donde al menos la última llamada tenga un `percentage` en `[0, 100]`, el estado final de `HomeUiState` debe ser igual al producido por la última llamada válida de la secuencia.

**Valida: Requisito 4.6**

---

### Propiedad 4: `BatteryIndicator` muestra el porcentaje como texto

*Para cualquier* entero `batteryPercentage` en `[0, 100]` (incluyendo el caso borde `0`), el composable `BatteryIndicator` debe renderizar un nodo de texto que contenga exactamente la cadena `"$batteryPercentage%"`.

**Valida: Requisitos 6.1, 6.3**

---

### Propiedad 5: `BatteryIndicator` muestra ícono de carga cuando `isCharging` es `true`

*Para cualquier* estado donde `isCharging == true`, el composable `BatteryIndicator` debe incluir en su árbol de composición un nodo con `contentDescription` o semántica asociada al estado de carga, independientemente del valor de `batteryPercentage`.

**Valida: Requisito 6.2**

---

### Propiedad 6: Propagación reactiva de batería desde `HomeUiState` hasta `EsbotTopBar`

*Para cualquier* par de valores `(batteryPercentage: Int, isCharging: Boolean)` emitido por `HomeViewModel.uiState`, la cadena `HomeScreen → HomeScreenContent → EsbotTopBar` debe reflejar esos mismos valores en el composable `BatteryIndicator` en la siguiente recomposición, sin requerir interacción del usuario.

**Valida: Requisitos 5.1, 5.2, 5.3, 5.4, 6.5**

---

## Manejo de Errores

| Escenario | Comportamiento esperado |
|-----------|------------------------|
| `Robot.getInstance()` retorna `null` en `onStart` | Se omite `addOnBatteryStatusChangedListener` con `?.` — sin excepción |
| `Robot.getInstance()` retorna `null` en `onStop` | Se omite `removeOnBatteryStatusChangedListener` con `?.` — sin excepción |
| `BatteryData.batteryPercentage` fuera de `[0, 100]` | `updateBattery` ignora el valor; el estado previo se mantiene |
| SDK no disponible en emulador | La app funciona normalmente; `batteryPercentage` permanece en `0` e `isCharging` en `false` |
| Múltiples callbacks rápidos del SDK | Cada llamada a `updateBattery` actualiza el `StateFlow`; Compose coalesce las recomposiciones |

---

## Estrategia de Testing

### Enfoque dual

Se combinan tests unitarios (ejemplos concretos y casos borde) con tests de propiedades (cobertura universal sobre rangos de valores).

### Tests unitarios

Ubicación: `app/src/test/java/com/esbot/edulab/ui/home/HomeViewModelTest.kt`

Casos a cubrir:
- `HomeUiState` instanciado sin argumentos tiene `batteryPercentage = 0` e `isCharging = false`
- `updateBattery(50, true)` actualiza ambos campos correctamente
- `updateBattery(-1, true)` no modifica el estado
- `updateBattery(101, false)` no modifica el estado
- `updateBattery(0, false)` actualiza correctamente (caso borde mínimo)
- `updateBattery(100, true)` actualiza correctamente (caso borde máximo)
- Los campos existentes `isConnected` y `currentTime` no se ven afectados por `updateBattery`

Ubicación: `app/src/test/java/com/esbot/edulab/ui/components/BatteryIndicatorTest.kt`

Casos a cubrir:
- `BatteryIndicator(0, false)` muestra el texto `"0%"` (caso borde)
- `BatteryIndicator(100, true)` muestra el texto `"100%"` y el ícono de carga

### Tests de propiedades

Librería: **[Kotest Property Testing](https://kotest.io/docs/proptest/property-based-testing.html)** (`io.kotest:kotest-property`)

Configuración mínima: **100 iteraciones** por propiedad.

Cada test debe incluir un comentario con el tag:
`// Feature: temi-battery-indicator, Property N: <texto de la propiedad>`

| Propiedad | Test | Generadores |
|-----------|------|-------------|
| Propiedad 1 | Para `percentage` en `[0, 100]` e `isCharging` aleatorio, el estado refleja ambos valores | `Arb.int(0..100)`, `Arb.boolean()` |
| Propiedad 2 | Para `percentage` fuera de `[0, 100]`, el estado no cambia | `Arb.int().filter { it < 0 || it > 100 }` |
| Propiedad 3 | Para secuencia de llamadas, el estado final es el de la última llamada válida | `Arb.list(Arb.int(-10..110))` |
| Propiedad 4 | Para `percentage` en `[0, 100]`, el texto renderizado contiene `"$percentage%"` | `Arb.int(0..100)` |
| Propiedad 5 | Para `isCharging=true`, el árbol de composición contiene el ícono de carga | `Arb.int(0..100)` |
| Propiedad 6 | Para cualquier par `(percentage, isCharging)`, `EsbotTopBar` refleja los valores | `Arb.int(0..100)`, `Arb.boolean()` |

### Cobertura de casos borde

Los generadores de las Propiedades 1 y 4 deben incluir explícitamente los valores `0` y `100` para garantizar cobertura de los extremos del rango.
