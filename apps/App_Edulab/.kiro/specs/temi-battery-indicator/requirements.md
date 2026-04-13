# Documento de Requisitos

## Introducción

Esta feature agrega al `EsbotTopBar` de la aplicación Android EduLab la capacidad de mostrar en tiempo real el nivel de batería del robot Temi. El indicador debe actualizarse dinámicamente mediante el listener del SDK de Temi, integrarse en el estado unificado `HomeUiState` del `HomeViewModel`, y respetar el ciclo de vida de la `MainActivity` para registrar y remover el listener correctamente.

## Glosario

- **BatteryIndicator**: Componente visual dentro de `EsbotTopBar` que muestra el porcentaje de batería del robot Temi.
- **BatteryData**: Clase del SDK de Temi (`com.robotemi.sdk.BatteryData`) que contiene `batteryPercentage: Int` e `isCharging: Boolean`.
- **BatteryListener**: Implementación de `OnBatteryStatusChangedListener` que recibe actualizaciones de batería desde el SDK de Temi.
- **Robot**: Singleton del SDK de Temi (`com.robotemi.sdk.Robot`) accesible mediante `Robot.getInstance()`.
- **HomeViewModel**: ViewModel con anotación `@HiltViewModel` que gestiona el estado de la pantalla principal mediante `HomeUiState`.
- **HomeUiState**: Data class que representa el estado unificado de la pantalla principal, actualmente con `isConnected: Boolean` y `currentTime: String`.
- **EsbotTopBar**: Composable de la barra superior de la aplicación, ubicado en `TopBar.kt`.
- **HomeScreenContent**: Composable intermediario que recibe props del `HomeScreen` y las pasa al `EsbotTopBar`.
- **MainActivity**: Actividad principal que extiende `AppCompatActivity` y gestiona el ciclo de vida del `BatteryListener`.
- **SDK de Temi**: Biblioteca externa (`com.robotemi.sdk`) que provee acceso al hardware del robot Temi.

---

## Requisitos

### Requisito 1: Dependencia del SDK de Temi en Gradle

**User Story:** Como desarrollador, quiero que el SDK de Temi esté declarado como dependencia en el proyecto, para poder usar sus clases en el código de la aplicación.

#### Criterios de Aceptación

1. THE proyecto SHALL declarar la dependencia del SDK de Temi en el archivo `app/build.gradle.kts` con la versión compatible con el robot Temi utilizado.
2. WHEN el proyecto es sincronizado con Gradle, THE SDK de Temi SHALL estar disponible para su importación en todos los módulos del proyecto.
3. IF la dependencia del SDK de Temi no puede resolverse durante la sincronización, THEN THE sistema de build SHALL mostrar un mensaje de error descriptivo indicando el artefacto no encontrado.

---

### Requisito 2: Extensión de HomeUiState con datos de batería

**User Story:** Como desarrollador, quiero que `HomeUiState` incluya el porcentaje de batería y el estado de carga del robot Temi, para que el estado de la UI sea la única fuente de verdad para la pantalla principal.

#### Criterios de Aceptación

1. THE `HomeUiState` SHALL incluir el campo `batteryPercentage: Int` con valor por defecto `0`.
2. THE `HomeUiState` SHALL incluir el campo `isCharging: Boolean` con valor por defecto `false`.
3. WHEN `HomeUiState` es instanciado sin argumentos, THE `HomeUiState` SHALL tener `batteryPercentage` igual a `0` e `isCharging` igual a `false`.
4. THE `HomeUiState` SHALL mantener los campos existentes `isConnected: Boolean` y `currentTime: String` sin modificaciones en su comportamiento.

---

### Requisito 3: Registro y remoción del BatteryListener en el ciclo de vida

**User Story:** Como desarrollador, quiero que el listener de batería se registre y remueva correctamente según el ciclo de vida de la actividad, para evitar fugas de memoria y callbacks innecesarios cuando la app está en segundo plano.

#### Criterios de Aceptación

1. WHEN `MainActivity.onStart()` es invocado, THE `MainActivity` SHALL registrar el `BatteryListener` mediante `Robot.getInstance().addOnBatteryStatusChangedListener(listener)`.
2. WHEN `MainActivity.onStop()` es invocado, THE `MainActivity` SHALL remover el `BatteryListener` mediante `Robot.getInstance().removeOnBatteryStatusChangedListener(listener)`.
3. WHILE el `BatteryListener` está registrado, THE `BatteryListener` SHALL recibir cada actualización de `BatteryData` emitida por el SDK de Temi.
4. IF `Robot.getInstance()` retorna `null` durante el registro o remoción del listener, THEN THE `MainActivity` SHALL omitir la operación sin lanzar una excepción.
5. THE `BatteryListener` SHALL implementar la interfaz `OnBatteryStatusChangedListener` del SDK de Temi.

---

### Requisito 4: Actualización del estado de batería en HomeViewModel

**User Story:** Como desarrollador, quiero que el `HomeViewModel` exponga un método para actualizar el porcentaje de batería en `HomeUiState`, para que la `MainActivity` pueda delegar la actualización de estado sin acoplar la UI al SDK directamente.

#### Criterios de Aceptación

1. THE `HomeViewModel` SHALL exponer un método `updateBattery(percentage: Int, isCharging: Boolean)` accesible desde la `MainActivity`.
2. WHEN `updateBattery` es invocado con un `percentage` entre `0` y `100`, THE `HomeViewModel` SHALL actualizar `HomeUiState.batteryPercentage` con el valor recibido.
3. WHEN `updateBattery` es invocado con `isCharging` igual a `true`, THE `HomeViewModel` SHALL actualizar `HomeUiState.isCharging` a `true`.
4. WHEN `updateBattery` es invocado con `isCharging` igual a `false`, THE `HomeViewModel` SHALL actualizar `HomeUiState.isCharging` a `false`.
5. IF `updateBattery` es invocado con un `percentage` menor a `0` o mayor a `100`, THEN THE `HomeViewModel` SHALL ignorar la actualización y mantener el valor previo de `batteryPercentage`.
6. WHEN `updateBattery` es invocado múltiples veces consecutivas, THE `HomeViewModel` SHALL reflejar únicamente el último valor recibido en `HomeUiState` (idempotencia del estado final).

---

### Requisito 5: Propagación de datos de batería hacia EsbotTopBar

**User Story:** Como desarrollador, quiero que el porcentaje de batería fluya desde `HomeViewModel` hasta `EsbotTopBar` a través de la cadena de composables existente, para mantener la arquitectura MVVM sin acoplamientos directos entre la UI y el SDK.

#### Criterios de Aceptación

1. THE `HomeScreen` SHALL leer `batteryPercentage` e `isCharging` desde `HomeUiState` y pasarlos como parámetros a `HomeScreenContent`.
2. THE `HomeScreenContent` SHALL recibir `batteryPercentage: Int` e `isCharging: Boolean` como parámetros y pasarlos a `EsbotTopBar`.
3. THE `EsbotTopBar` SHALL recibir `batteryPercentage: Int` e `isCharging: Boolean` como parámetros para renderizar el `BatteryIndicator`.
4. WHEN `batteryPercentage` o `isCharging` cambian en `HomeUiState`, THE `EsbotTopBar` SHALL recomponerse automáticamente mostrando los nuevos valores.

---

### Requisito 6: Visualización del indicador de batería en EsbotTopBar

**User Story:** Como usuario, quiero ver el nivel de batería del robot Temi en la barra superior de la aplicación, para conocer el estado energético del robot sin salir de la pantalla principal.

#### Criterios de Aceptación

1. THE `BatteryIndicator` SHALL mostrar el valor de `batteryPercentage` como texto en formato `"XX%"` dentro del `EsbotTopBar`.
2. WHEN `isCharging` es `true`, THE `BatteryIndicator` SHALL mostrar un ícono o indicador visual que distinga el estado de carga del estado de descarga.
3. WHEN `batteryPercentage` es `0` y `isCharging` es `false`, THE `BatteryIndicator` SHALL mostrar `"0%"` sin ocultar el componente.
4. THE `BatteryIndicator` SHALL ser visible en el `EsbotTopBar` junto a los demás elementos existentes (hora, idioma, estado de conexión) sin solaparse con ellos.
5. WHEN `batteryPercentage` cambia de un valor a otro, THE `BatteryIndicator` SHALL actualizar el texto mostrado en la siguiente recomposición sin requerir interacción del usuario.
