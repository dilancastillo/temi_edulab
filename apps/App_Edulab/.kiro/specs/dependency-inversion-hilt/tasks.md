# Plan de Implementación: Inversión de Dependencias con Hilt

## Visión General

Refactoring del proyecto EduLab para aplicar DIP mediante la interfaz `NetworkStatusProvider` e inyección de dependencias con Hilt. El comportamiento observable de la app no cambia.

## Tareas

- [x] 1. Configurar dependencias de Hilt en Gradle
  - [x] 1.1 Actualizar `gradle/libs.versions.toml` con versiones de Hilt y KSP
    - Añadir en `[versions]`: `hilt = "2.51.1"`, `ksp = "2.0.21-1.0.28"`, `hiltNavigationCompose = "1.2.0"`
    - Añadir en `[libraries]`: `hilt-android`, `hilt-android-compiler`, `hilt-navigation-compose`
    - Añadir en `[plugins]`: `hilt-android`, `ksp`
    - _Requisitos: 2.1, 2.6_

  - [x] 1.2 Actualizar `build.gradle.kts` (raíz) para declarar los plugins de Hilt y KSP con `apply false`
    - Añadir `alias(libs.plugins.hilt.android) apply false`
    - Añadir `alias(libs.plugins.ksp) apply false`
    - _Requisitos: 2.2_

  - [x] 1.3 Actualizar `app/build.gradle.kts` para aplicar plugins y declarar dependencias
    - Aplicar plugins `hilt.android` y `ksp`
    - Añadir `implementation(libs.hilt.android)`, `ksp(libs.hilt.android.compiler)`, `implementation(libs.hilt.navigation.compose)`
    - _Requisitos: 2.3, 2.4, 2.5_

- [x] 2. Definir la abstracción `NetworkStatusProvider`
  - [x] 2.1 Crear `NetworkStatusProvider.kt` en `com.esbot.edulab.core.network`
    - Declarar `interface NetworkStatusProvider` con la propiedad `val isConnected: StateFlow<Boolean>`
    - _Requisitos: 1.1, 1.2_

- [x] 3. Modificar `ConnectivityObserver` para implementar la interfaz
  - [x] 3.1 Hacer que `ConnectivityObserver` implemente `NetworkStatusProvider` y añadir `@Inject`
    - Añadir `: NetworkStatusProvider` a la declaración de clase
    - Anotar el constructor con `@Inject` y añadir `@Singleton` a la clase
    - Mantener toda la lógica interna existente sin cambios
    - _Requisitos: 1.3, 1.4_

- [x] 4. Crear `NetworkModule` para proveer la dependencia vía Hilt
  - [x] 4.1 Crear `NetworkModule.kt` en `com.esbot.edulab.core.network`
    - Declarar `object NetworkModule` anotado con `@Module` y `@InstallIn(SingletonComponent::class)`
    - Implementar `provideNetworkStatusProvider(@ApplicationContext context: Context): NetworkStatusProvider` anotado con `@Provides` y `@Singleton`
    - Retornar `ConnectivityObserver(context)` como implementación
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Crear `EduLabApplication` y registrarla en el manifiesto
  - [x] 5.1 Crear `EduLabApplication.kt` en `com.esbot.edulab`
    - Declarar `class EduLabApplication : Application()` anotada con `@HiltAndroidApp`
    - _Requisitos: 3.1, 3.2, 3.3_

  - [x] 5.2 Actualizar `AndroidManifest.xml` para referenciar `EduLabApplication`
    - Añadir `android:name=".EduLabApplication"` al elemento `<application>`
    - _Requisitos: 3.4_

- [x] 6. Refactorizar `HomeViewModel` para usar inyección de dependencias
  - [x] 6.1 Modificar `HomeViewModel` para recibir `NetworkStatusProvider` por inyección de constructor
    - Cambiar `AndroidViewModel(application)` por `ViewModel()`
    - Anotar la clase con `@HiltViewModel` y el constructor con `@Inject`
    - Reemplazar el parámetro `application: Application` por `networkStatusProvider: NetworkStatusProvider`
    - Eliminar la instanciación directa de `ConnectivityObserver`
    - Delegar `isConnected` directamente desde `networkStatusProvider.isConnected`
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 7. Actualizar `HomeScreen` y `MainActivity` para integrar Hilt
  - [x] 7.1 Actualizar `HomeScreen` para obtener el ViewModel mediante `hiltViewModel()`
    - Reemplazar `viewModel()` por `hiltViewModel()` en el parámetro por defecto de `HomeScreen`
    - _Requisitos: 6.2_

  - [x] 7.2 Anotar `MainActivity` con `@AndroidEntryPoint`
    - Añadir la anotación `@AndroidEntryPoint` a la clase `MainActivity`
    - _Requisitos: 6.1_

- [ ] 8. Checkpoint — Verificar que el proyecto compila correctamente
  - Asegurarse de que el proyecto compila sin errores de KSP ni de Hilt.
  - Preguntar al usuario si hay dudas antes de continuar con los tests.

- [x] 9. Escribir tests unitarios y de propiedad
  - [x] 9.1 Crear `FakeNetworkStatusProvider` en el directorio de test
    - Implementar `NetworkStatusProvider` con un `MutableStateFlow` controlable
    - Exponer método `emit(value: Boolean)` para controlar el estado en tests
    - _Requisitos: 5.3, 7.1_

  - [ ]* 9.2 Escribir test de propiedad 1: Delegación transparente de `isConnected`
    - **Propiedad 1: Delegación transparente de isConnected**
    - Usar `checkAll(Arb.list(Arb.boolean(), 1..20))` para verificar que `HomeViewModel.isConnected` emite exactamente los mismos valores que el provider, en el mismo orden
    - Mínimo 100 iteraciones
    - Incluir comentario: `// Feature: dependency-inversion-hilt, Property 1: Delegación transparente de isConnected`
    - **Valida: Requisito 5.6**

  - [ ]* 9.3 Escribir test de propiedad 2: Reactividad correcta ante cambios de conectividad
    - **Propiedad 2: Reactividad correcta ante cambios de conectividad**
    - Usar `checkAll(Arb.boolean())` para verificar que el provider emite `false` al perder red y `true` al recuperarla
    - Mínimo 100 iteraciones
    - Incluir comentario: `// Feature: dependency-inversion-hilt, Property 2: Reactividad correcta ante cambios de conectividad`
    - **Valida: Requisitos 7.2, 7.3**

  - [ ]* 9.4 Escribir tests unitarios para `HomeViewModel`
    - Verificar que `isConnected` delega correctamente usando `FakeNetworkStatusProvider`
    - Verificar que `currentTime` se actualiza después de 60 segundos usando `TestCoroutineScheduler`
    - _Requisitos: 5.6, 7.4_

- [ ] 10. Checkpoint final — Asegurarse de que todos los tests pasan
  - Asegurarse de que todos los tests pasan, preguntar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los tests de propiedad validan comportamiento universal; los tests unitarios validan ejemplos concretos y casos borde
- El refactoring es puramente estructural: el comportamiento observable de la app no cambia
