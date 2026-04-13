# Documento de Requisitos

## Introducción

Este documento describe los requisitos para aplicar el principio de Inversión de Dependencias (DIP) en el proyecto Android EduLab con Jetpack Compose. Actualmente, `HomeViewModel` instancia directamente `ConnectivityObserver`, acoplando un módulo de alto nivel a uno de bajo nivel sin ninguna abstracción intermedia. El objetivo es introducir una interfaz `NetworkStatusProvider`, implementar inyección de dependencias con Hilt, y refactorizar los componentes afectados para que dependan de abstracciones en lugar de implementaciones concretas.

## Glosario

- **HomeViewModel**: ViewModel de alto nivel que gestiona el estado de la pantalla principal.
- **ConnectivityObserver**: Clase de bajo nivel que observa el estado de conectividad de red usando `ConnectivityManager`.
- **NetworkStatusProvider**: Interfaz que abstrae el acceso al estado de conectividad de red.
- **NetworkModule**: Módulo Hilt que provee las implementaciones de las dependencias de red.
- **EduLabApplication**: Clase `Application` anotada con `@HiltAndroidApp` que inicializa el grafo de dependencias de Hilt.
- **DIP**: Dependency Inversion Principle — los módulos de alto nivel no deben depender de módulos de bajo nivel; ambos deben depender de abstracciones.
- **Hilt**: Framework de inyección de dependencias para Android basado en Dagger.

---

## Requisitos

### Requisito 1: Definir la abstracción NetworkStatusProvider

**User Story:** Como desarrollador, quiero una interfaz que abstraiga el acceso al estado de red, para que los módulos de alto nivel dependan de una abstracción y no de una implementación concreta.

#### Criterios de Aceptación

1. THE `NetworkStatusProvider` SHALL exponer una propiedad `isConnected` de tipo `StateFlow<Boolean>`.
2. THE `NetworkStatusProvider` SHALL residir en el paquete `com.esbot.edulab.core.network`.
3. THE `ConnectivityObserver` SHALL implementar la interfaz `NetworkStatusProvider`.
4. WHEN `ConnectivityObserver` implementa `NetworkStatusProvider`, THE `ConnectivityObserver` SHALL mantener el comportamiento existente de observación de red sin modificar su lógica interna.

---

### Requisito 2: Configurar Hilt como framework de inyección de dependencias

**User Story:** Como desarrollador, quiero integrar Hilt en el proyecto, para que las dependencias se gestionen de forma centralizada y desacoplada.

#### Criterios de Aceptación

1. THE `gradle/libs.versions.toml` SHALL declarar las versiones de Hilt (`hilt = "2.51.1"`) y del plugin de Kotlin KSP compatibles con `kotlin = "2.0.21"`.
2. THE `build.gradle.kts` (raíz del proyecto) SHALL aplicar el plugin `com.google.dagger.hilt.android` con `apply false`.
3. THE `app/build.gradle.kts` SHALL aplicar los plugins `com.google.dagger.hilt.android` y `com.google.devtools.ksp`.
4. THE `app/build.gradle.kts` SHALL declarar las dependencias `hilt-android` y `hilt-android-compiler` (vía KSP).
5. THE `app/build.gradle.kts` SHALL declarar la dependencia `androidx.hilt:hilt-navigation-compose` para integración con Compose.
6. IF las versiones de Hilt y KSP no son compatibles con la versión de Kotlin del proyecto, THEN THE `gradle/libs.versions.toml` SHALL ajustar las versiones para garantizar compatibilidad.

---

### Requisito 3: Crear la clase Application anotada con @HiltAndroidApp

**User Story:** Como desarrollador, quiero una clase `Application` personalizada anotada con `@HiltAndroidApp`, para que Hilt pueda inicializar su grafo de dependencias al arrancar la app.

#### Criterios de Aceptación

1. THE `EduLabApplication` SHALL extender `android.app.Application`.
2. THE `EduLabApplication` SHALL estar anotada con `@HiltAndroidApp`.
3. THE `EduLabApplication` SHALL residir en el paquete raíz `com.esbot.edulab`.
4. WHEN `EduLabApplication` es creada, THE `AndroidManifest.xml` SHALL referenciarla en el atributo `android:name` del elemento `<application>`.

---

### Requisito 4: Proveer NetworkStatusProvider mediante un módulo Hilt

**User Story:** Como desarrollador, quiero un módulo Hilt que provea `NetworkStatusProvider`, para que Hilt pueda inyectar la implementación correcta en cualquier clase que la solicite.

#### Criterios de Aceptación

1. THE `NetworkModule` SHALL estar anotado con `@Module` y `@InstallIn(SingletonComponent::class)`.
2. THE `NetworkModule` SHALL residir en el paquete `com.esbot.edulab.core.network`.
3. WHEN Hilt necesita proveer `NetworkStatusProvider`, THE `NetworkModule` SHALL retornar una instancia de `ConnectivityObserver` como implementación de `NetworkStatusProvider`.
4. THE `NetworkModule` SHALL anotar el método proveedor con `@Provides` y `@Singleton` para garantizar una única instancia en el ciclo de vida de la aplicación.
5. THE `NetworkModule` SHALL recibir el `@ApplicationContext Context` como parámetro del método proveedor para construir `ConnectivityObserver`.

---

### Requisito 5: Refactorizar HomeViewModel para usar inyección de dependencias

**User Story:** Como desarrollador, quiero que `HomeViewModel` reciba `NetworkStatusProvider` por inyección de constructor, para que no dependa directamente de `ConnectivityObserver` ni de `Application`.

#### Criterios de Aceptación

1. THE `HomeViewModel` SHALL estar anotado con `@HiltViewModel`.
2. THE `HomeViewModel` SHALL extender `ViewModel` en lugar de `AndroidViewModel`.
3. THE `HomeViewModel` SHALL declarar un constructor anotado con `@Inject` que reciba `NetworkStatusProvider` como parámetro.
4. WHEN `HomeViewModel` es instanciado por Hilt, THE `HomeViewModel` SHALL recibir la implementación de `NetworkStatusProvider` provista por `NetworkModule`.
5. THE `HomeViewModel` SHALL eliminar la instanciación directa de `ConnectivityObserver` y el parámetro `application`.
6. WHEN `HomeViewModel` expone `isConnected`, THE `HomeViewModel` SHALL delegar el valor directamente desde `NetworkStatusProvider.isConnected` sin modificar el comportamiento observable existente.

---

### Requisito 6: Anotar MainActivity con @AndroidEntryPoint

**User Story:** Como desarrollador, quiero que `MainActivity` esté anotada con `@AndroidEntryPoint`, para que Hilt pueda inyectar dependencias en el contexto de la Activity y los ViewModels sean resueltos correctamente por Hilt.

#### Criterios de Aceptación

1. THE `MainActivity` SHALL estar anotada con `@AndroidEntryPoint`.
2. WHEN `MainActivity` es anotada con `@AndroidEntryPoint`, THE `HomeScreen` composable SHALL obtener `HomeViewModel` mediante `hiltViewModel()` en lugar de `viewModel()`.
3. IF `HomeScreen` o cualquier composable hijo instancia `HomeViewModel` directamente sin `hiltViewModel()`, THEN THE compilador de Hilt SHALL reportar un error en tiempo de compilación.

---

### Requisito 7: Preservar el comportamiento funcional existente

**User Story:** Como desarrollador, quiero que el refactoring no altere el comportamiento observable de la aplicación, para que los usuarios finales no perciban ningún cambio.

#### Criterios de Aceptación

1. WHEN la aplicación se inicia después del refactoring, THE `HomeViewModel` SHALL exponer el estado de conectividad correcto a través de `isConnected` con el mismo comportamiento que antes del refactoring.
2. WHEN el dispositivo pierde conectividad, THE `NetworkStatusProvider` SHALL emitir `false` en `isConnected` dentro de un ciclo de red.
3. WHEN el dispositivo recupera conectividad, THE `NetworkStatusProvider` SHALL emitir `true` en `isConnected` dentro de un ciclo de red.
4. THE `HomeViewModel` SHALL continuar actualizando `currentTime` cada 60 segundos sin cambios en su comportamiento.
