# Documento de Requisitos

## Introducción

Este documento describe los requisitos para refactorizar la integración del SDK de Temi en la aplicación Android EduLab, aplicando los principios SOLID que actualmente se violan.

La situación actual presenta dos violaciones principales:

- **Single Responsibility (S)**: `MainActivity` asume tres responsabilidades distintas: montar la UI con Jetpack Compose, gestionar el idioma de la aplicación, y gestionar el ciclo de vida del SDK de Temi (reflexión, listeners, estado de batería).
- **Dependency Inversion (D)**: `MainActivity` accede directamente al SDK de Temi mediante reflexión y llama a `viewModel.updateBattery()` de forma directa, sin ninguna capa de abstracción.

La solución sigue el patrón ya establecido en el proyecto con `NetworkStatusProvider` / `ConnectivityObserver`, creando una abstracción `BatteryStatusProvider` implementada por `TemiBatteryObserver`, provista mediante Hilt, e inyectada en `HomeViewModel`.

---

## Glosario

- **BatteryStatusProvider**: Interfaz que abstrae el acceso al estado de batería del robot Temi. Define el contrato que cualquier implementación debe cumplir.
- **TemiBatteryObserver**: Implementación concreta de `BatteryStatusProvider` que encapsula toda la lógica de reflexión del SDK de Temi.
- **RobotModule**: Módulo Hilt que provee la implementación de `BatteryStatusProvider` al grafo de dependencias.
- **HomeViewModel**: ViewModel de la pantalla principal que consume `BatteryStatusProvider` para exponer el estado de batería a la UI.
- **MainActivity**: Activity principal cuya responsabilidad queda reducida a montar la UI y gestionar el idioma.
- **SDK de Temi**: Biblioteca del robot Temi, incluida como `compileOnly` para mantener compatibilidad con el emulador. Se accede mediante reflexión en tiempo de ejecución.
- **StateFlow**: Tipo de flujo reactivo de Kotlin Coroutines que mantiene y emite el último valor conocido.
- **Reflexión**: Mecanismo de Java/Kotlin para acceder a clases y métodos en tiempo de ejecución sin dependencia en tiempo de compilación.
- **OnRobotReadyListener**: Listener del SDK de Temi que notifica cuando el robot está listo para recibir comandos.
- **OnBatteryStatusChangedListener**: Listener del SDK de Temi que notifica cambios en el estado de batería.
- **BatteryData**: Objeto del SDK de Temi que contiene los campos `level` (Int) e `isCharging` (Boolean).

---

## Requisitos

### Requisito 1: Crear la interfaz BatteryStatusProvider

**User Story:** Como desarrollador, quiero una interfaz que abstraiga el acceso al estado de batería del robot, para que el resto del sistema no dependa directamente del SDK de Temi ni de su mecanismo de reflexión.

#### Criterios de Aceptación

1. THE `BatteryStatusProvider` SHALL exponer una propiedad `batteryPercentage` de tipo `StateFlow<Int?>` que represente el porcentaje de batería actual, o `null` si aún no se ha recibido ningún valor.
2. THE `BatteryStatusProvider` SHALL exponer una propiedad `isCharging` de tipo `StateFlow<Boolean>` que indique si el robot está cargando en este momento.
3. THE `BatteryStatusProvider` SHALL declarar una función `startObserving()` que inicie la observación del estado de batería.
4. THE `BatteryStatusProvider` SHALL declarar una función `stopObserving()` que detenga la observación del estado de batería y libere los recursos asociados.
5. THE `BatteryStatusProvider` SHALL residir en el paquete `core/robot/` siguiendo la misma estructura que `NetworkStatusProvider` en `core/network/`.

---

### Requisito 2: Crear la implementación TemiBatteryObserver

**User Story:** Como desarrollador, quiero una clase que encapsule toda la lógica de reflexión del SDK de Temi, para que esa complejidad esté aislada en un único lugar y sea fácil de mantener o sustituir.

#### Criterios de Aceptación

1. THE `TemiBatteryObserver` SHALL implementar la interfaz `BatteryStatusProvider`.
2. WHEN `startObserving()` es invocado, THE `TemiBatteryObserver` SHALL obtener la instancia del robot mediante `Class.forName("com.robotemi.sdk.Robot").getMethod("getInstance").invoke(null)`.
3. WHEN `startObserving()` es invocado y la instancia del robot está disponible, THE `TemiBatteryObserver` SHALL registrar un `OnRobotReadyListener` mediante reflexión para recibir la notificación de robot listo.
4. WHEN `startObserving()` es invocado y la instancia del robot está disponible, THE `TemiBatteryObserver` SHALL registrar un `OnBatteryStatusChangedListener` mediante reflexión para recibir actualizaciones de batería en tiempo real.
5. WHEN el callback `onRobotReady` es recibido con `isReady == true`, THE `TemiBatteryObserver` SHALL invocar `getBatteryData()` mediante reflexión para leer el valor inicial de batería.
6. WHEN el callback `onBatteryStatusChanged` es recibido con un objeto `BatteryData` válido, THE `TemiBatteryObserver` SHALL extraer los campos `level` e `isCharging` mediante `getDeclaredField` y actualizar los `StateFlow` correspondientes.
7. WHEN `stopObserving()` es invocado, THE `TemiBatteryObserver` SHALL eliminar el `OnRobotReadyListener` y el `OnBatteryStatusChangedListener` del robot mediante reflexión.
8. WHEN `stopObserving()` es invocado, THE `TemiBatteryObserver` SHALL liberar todas las referencias internas al robot, a las clases y a los listeners para evitar fugas de memoria.
9. IF cualquier operación de reflexión lanza una excepción, THEN THE `TemiBatteryObserver` SHALL capturar la excepción, registrarla mediante `Log.e`, y continuar la ejecución sin propagar el error.
10. WHILE el SDK de Temi no está disponible en el dispositivo, THE `TemiBatteryObserver` SHALL mantener `batteryPercentage` con valor `null` e `isCharging` con valor `false`.
11. IF `level` recibido es menor que 0 o mayor que 100, THEN THE `TemiBatteryObserver` SHALL ignorar el valor y no actualizar el `StateFlow` de `batteryPercentage`.

---

### Requisito 3: Crear el módulo Hilt RobotModule

**User Story:** Como desarrollador, quiero que la implementación de `BatteryStatusProvider` sea provista por Hilt, para que las dependencias se gestionen de forma centralizada y consistente con el resto del proyecto.

#### Criterios de Aceptación

1. THE `RobotModule` SHALL ser un módulo Hilt anotado con `@Module` e `@InstallIn(SingletonComponent::class)`.
2. THE `RobotModule` SHALL proveer una instancia única (`@Singleton`) de `BatteryStatusProvider` cuya implementación concreta sea `TemiBatteryObserver`.
3. THE `RobotModule` SHALL residir en el paquete `core/robot/` siguiendo la misma estructura que `NetworkModule` en `core/network/`.
4. THE `RobotModule` SHALL inyectar el `Context` de aplicación en `TemiBatteryObserver` mediante `@ApplicationContext` si fuera necesario para futuras extensiones.

---

### Requisito 4: Refactorizar HomeViewModel para recibir BatteryStatusProvider

**User Story:** Como desarrollador, quiero que `HomeViewModel` reciba `BatteryStatusProvider` por inyección de constructor, para que la fuente de datos de batería sea intercambiable y testeable de forma aislada.

#### Criterios de Aceptación

1. THE `HomeViewModel` SHALL recibir una instancia de `BatteryStatusProvider` como parámetro de constructor inyectado por Hilt, de la misma forma que recibe `NetworkStatusProvider`.
2. WHEN `HomeViewModel` es inicializado, THE `HomeViewModel` SHALL suscribirse a `batteryStatusProvider.batteryPercentage` y actualizar `HomeUiState.batteryPercentage` con cada nuevo valor emitido.
3. WHEN `HomeViewModel` es inicializado, THE `HomeViewModel` SHALL suscribirse a `batteryStatusProvider.isCharging` y actualizar `HomeUiState.isCharging` con cada nuevo valor emitido.
4. THE `HomeViewModel` SHALL eliminar el método público `updateBattery(percentage: Int, isCharging: Boolean)` una vez que la suscripción reactiva a `BatteryStatusProvider` lo reemplace.
5. IF `batteryStatusProvider.batteryPercentage` emite `null`, THEN THE `HomeViewModel` SHALL reflejar `null` en `HomeUiState.batteryPercentage` sin lanzar ninguna excepción.

---

### Requisito 5: Refactorizar MainActivity para responsabilidad única

**User Story:** Como desarrollador, quiero que `MainActivity` solo se encargue de montar la UI y gestionar el idioma, para que su responsabilidad sea clara y no contenga lógica de dominio ni de infraestructura.

#### Criterios de Aceptación

1. THE `MainActivity` SHALL inyectar `BatteryStatusProvider` mediante `@Inject` de Hilt.
2. WHEN `onStart()` es invocado, THE `MainActivity` SHALL llamar a `batteryStatusProvider.startObserving()`.
3. WHEN `onStop()` es invocado, THE `MainActivity` SHALL llamar a `batteryStatusProvider.stopObserving()`.
4. THE `MainActivity` SHALL no contener ninguna lógica de reflexión del SDK de Temi tras la refactorización.
5. THE `MainActivity` SHALL no llamar directamente a ningún método del `HomeViewModel` relacionado con batería tras la refactorización.
6. THE `MainActivity` SHALL no declarar ninguna variable de estado relacionada con el robot Temi (referencias al robot, clases, listeners) tras la refactorización.
7. THE `MainActivity` SHALL mantener la lógica de gestión de idioma mediante `AppCompatDelegate.setApplicationLocales` sin modificaciones.

---

### Requisito 6: Testabilidad mediante implementación falsa de BatteryStatusProvider

**User Story:** Como desarrollador, quiero poder crear una implementación falsa de `BatteryStatusProvider` en los tests, para verificar el comportamiento de `HomeViewModel` sin depender del SDK de Temi ni de hardware real.

#### Criterios de Aceptación

1. THE `BatteryStatusProvider` SHALL ser una interfaz, lo que permite crear implementaciones de prueba (`FakeBatteryStatusProvider`) sin dependencias externas.
2. WHEN se instancia `HomeViewModel` en un test con una `FakeBatteryStatusProvider`, THE `HomeViewModel` SHALL reflejar en `uiState` los valores emitidos por la implementación falsa.
3. WHEN `FakeBatteryStatusProvider` emite un porcentaje de batería válido (0–100), THE `HomeViewModel` SHALL actualizar `HomeUiState.batteryPercentage` con ese valor.
4. WHEN `FakeBatteryStatusProvider` emite `isCharging = true`, THE `HomeViewModel` SHALL actualizar `HomeUiState.isCharging` a `true`.
5. WHEN `FakeBatteryStatusProvider` emite `batteryPercentage = null`, THE `HomeViewModel` SHALL mantener `HomeUiState.batteryPercentage` como `null`.
