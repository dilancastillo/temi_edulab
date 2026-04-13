# Plan de Tareas: temi-battery-solid-refactor

## Tareas

- [x] 1. Crear BatteryStatusProvider (interfaz)
  - [x] 1.1 Crear el archivo `app/src/main/java/com/esbot/edulab/core/robot/BatteryStatusProvider.kt`
  - [x] 1.2 Declarar la interfaz con `batteryPercentage: StateFlow<Int?>`, `isCharging: StateFlow<Boolean>`, `startObserving()` y `stopObserving()`

- [x] 2. Crear TemiBatteryObserver (implementación)
  - [x] 2.1 Crear el archivo `app/src/main/java/com/esbot/edulab/core/robot/TemiBatteryObserver.kt`
  - [x] 2.2 Implementar `BatteryStatusProvider` con `@Singleton` e `@Inject constructor(@ApplicationContext context: Context)`
  - [x] 2.3 Declarar los `MutableStateFlow` internos (`_batteryPercentage`, `_isCharging`) y las variables de referencia al robot y listeners
  - [x] 2.4 Implementar `startObserving()`: obtener `Robot.getInstance()` mediante reflexión, registrar `OnRobotReadyListener` y `OnBatteryStatusChangedListener` mediante `Proxy.newProxyInstance`
  - [x] 2.5 Implementar el callback `onRobotReady`: llamar `getBatteryData()` mediante reflexión cuando `isReady == true`
  - [x] 2.6 Implementar el callback `onBatteryStatusChanged`: extraer `level` e `isCharging` con `getDeclaredField`, validar rango [0,100] y actualizar los `StateFlow`
  - [x] 2.7 Implementar `stopObserving()`: desregistrar listeners mediante reflexión y liberar todas las referencias en bloque `finally`
  - [x] 2.8 Envolver todas las operaciones de reflexión en `try/catch(Exception)` con `Log.e`

- [x] 3. Crear RobotModule (módulo Hilt)
  - [x] 3.1 Crear el archivo `app/src/main/java/com/esbot/edulab/core/robot/RobotModule.kt`
  - [x] 3.2 Anotar con `@Module` e `@InstallIn(SingletonComponent::class)`
  - [x] 3.3 Implementar `@Provides @Singleton fun provideBatteryStatusProvider(@ApplicationContext context: Context): BatteryStatusProvider = TemiBatteryObserver(context)`

- [x] 4. Refactorizar HomeViewModel
  - [x] 4.1 Añadir `batteryStatusProvider: BatteryStatusProvider` como parámetro de constructor junto a `networkStatusProvider`
  - [x] 4.2 En el bloque `init`, añadir `viewModelScope.launch` para colectar `batteryStatusProvider.batteryPercentage` y actualizar `_uiState`
  - [x] 4.3 En el bloque `init`, añadir `viewModelScope.launch` para colectar `batteryStatusProvider.isCharging` y actualizar `_uiState`
  - [x] 4.4 Eliminar el método `updateBattery(percentage: Int, isCharging: Boolean)`

- [x] 5. Refactorizar MainActivity
  - [x] 5.1 Añadir `@Inject lateinit var batteryStatusProvider: BatteryStatusProvider`
  - [x] 5.2 En `onStart()`, reemplazar `setupTemi()` por `batteryStatusProvider.startObserving()`
  - [x] 5.3 En `onStop()`, reemplazar `teardownTemi()` por `batteryStatusProvider.stopObserving()`
  - [x] 5.4 Eliminar los métodos `setupTemi()`, `teardownTemi()`, `readInitialBattery()` y `parseBatteryData()`
  - [x] 5.5 Eliminar todas las variables de estado del robot (`temiRobot`, `temiRobotClass`, `temiRobotReadyListener`, `temiRobotReadyListenerClass`, `temiBatteryListener`, `temiBatteryListenerClass`)
  - [x] 5.6 Eliminar el import de `HomeViewModel` si ya no se usa directamente y el `private val viewModel` si queda sin uso

- [ ] 6. Crear FakeBatteryStatusProvider y tests
  - [x] 6.1 Crear `app/src/test/java/com/esbot/edulab/core/robot/FakeBatteryStatusProvider.kt` implementando `BatteryStatusProvider` con `MutableStateFlow` controlables y métodos `emitPercentage(Int?)` y `emitCharging(Boolean)`
  - [x] 6.2 Actualizar `HomeViewModelTest`: reemplazar las llamadas a `updateBattery()` por emisiones a través de `FakeBatteryStatusProvider` y actualizar el constructor de `HomeViewModel` para pasar también `FakeBatteryStatusProvider`
  - [x] 6.3 Añadir test unitario: estado inicial es `batteryPercentage = null` e `isCharging = false`
  - [x] 6.4 Añadir test unitario: emisión de `null` mantiene `batteryPercentage` como `null` sin excepción
  - [x] 6.5 Añadir test de propiedad (Property 1): para cualquier `Int` en [0,100] y `Boolean`, los valores emitidos se reflejan en `HomeUiState` — tag `Feature: temi-battery-solid-refactor, Property 1`
  - [ ] 6.6 Añadir test de propiedad (Property 2): para cualquier `Int` fuera de [0,100], el `StateFlow` de `batteryPercentage` no cambia — tag `Feature: temi-battery-solid-refactor, Property 2`
  - [ ] 6.7 Añadir test de propiedad (Property 3): emitir `null` no lanza excepción y `HomeUiState.batteryPercentage` es `null` — tag `Feature: temi-battery-solid-refactor, Property 3`
  - [ ] 6.8 Añadir test de propiedad (Property 5): para cualquier secuencia no vacía de valores válidos, `HomeUiState.batteryPercentage` refleja el último emitido — tag `Feature: temi-battery-solid-refactor, Property 5`
