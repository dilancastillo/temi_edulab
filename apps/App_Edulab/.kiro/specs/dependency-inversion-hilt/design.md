# Diseño Técnico: Inversión de Dependencias con Hilt

## Visión General

Este documento describe el diseño técnico para aplicar el Principio de Inversión de Dependencias (DIP) en el proyecto Android EduLab. El refactoring introduce la interfaz `NetworkStatusProvider`, integra Hilt como framework de inyección de dependencias, y elimina el acoplamiento directo entre `HomeViewModel` y `ConnectivityObserver`.

El cambio es puramente estructural: el comportamiento observable de la aplicación (estado de conectividad, actualización de hora) permanece idéntico antes y después del refactoring.

---

## Arquitectura

### Estado actual (antes del refactoring)

```mermaid
graph TD
    A[HomeViewModel] -->|instancia directa| B[ConnectivityObserver]
    B -->|usa| C[ConnectivityManager]
    D[HomeScreen] -->|viewModel()| A
    E[MainActivity] --> D
```

`HomeViewModel` extiende `AndroidViewModel` y construye `ConnectivityObserver` directamente en su cuerpo, violando DIP: un módulo de alto nivel depende de un módulo de bajo nivel sin abstracción intermedia.

### Estado objetivo (después del refactoring)

```mermaid
graph TD
    A[HomeViewModel] -->|depende de| I[NetworkStatusProvider]
    B[ConnectivityObserver] -->|implementa| I
    N[NetworkModule] -->|provee| B
    N -->|binds como| I
    H[Hilt DI Graph] -->|inyecta| A
    D[HomeScreen] -->|hiltViewModel()| A
    E[MainActivity] -->|@AndroidEntryPoint| D
    APP[EduLabApplication] -->|@HiltAndroidApp| H
```

`HomeViewModel` ahora depende únicamente de la abstracción `NetworkStatusProvider`. Hilt resuelve la implementación concreta (`ConnectivityObserver`) en tiempo de compilación a través de `NetworkModule`.

---

## Componentes e Interfaces

### NetworkStatusProvider (nueva interfaz)

```kotlin
// com.esbot.edulab.core.network.NetworkStatusProvider
interface NetworkStatusProvider {
    val isConnected: StateFlow<Boolean>
}
```

Abstracción que expone el estado de conectividad como `StateFlow<Boolean>`. Reside en el mismo paquete que `ConnectivityObserver` para mantener cohesión del módulo de red.

### ConnectivityObserver (modificado)

Implementa `NetworkStatusProvider`. La lógica interna de observación de red no cambia; solo se añade la declaración `implements NetworkStatusProvider` y se anota el constructor con `@Inject`.

```kotlin
// Cambio mínimo: añadir implements + @Inject
@Singleton
class ConnectivityObserver @Inject constructor(
    @ApplicationContext context: Context
) : NetworkStatusProvider {
    // lógica existente sin cambios
}
```

### NetworkModule (nuevo)

Módulo Hilt instalado en `SingletonComponent`. Provee `NetworkStatusProvider` como singleton, retornando una instancia de `ConnectivityObserver`.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideNetworkStatusProvider(
        @ApplicationContext context: Context
    ): NetworkStatusProvider = ConnectivityObserver(context)
}
```

### EduLabApplication (nueva)

Clase `Application` anotada con `@HiltAndroidApp`. Punto de entrada del grafo de dependencias de Hilt.

```kotlin
@HiltAndroidApp
class EduLabApplication : Application()
```

### HomeViewModel (modificado)

Cambia de `AndroidViewModel` a `ViewModel`. Recibe `NetworkStatusProvider` por inyección de constructor. Se elimina la instanciación directa de `ConnectivityObserver`.

```kotlin
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val networkStatusProvider: NetworkStatusProvider
) : ViewModel() {
    val isConnected: StateFlow<Boolean> = networkStatusProvider.isConnected
    // resto sin cambios
}
```

### HomeScreen (modificado)

Reemplaza `viewModel()` por `hiltViewModel()` para que Hilt resuelva el ViewModel.

```kotlin
@Composable
fun HomeScreen(viewModel: HomeViewModel = hiltViewModel()) { ... }
```

### MainActivity (modificado)

Se añade `@AndroidEntryPoint` para habilitar la inyección de Hilt en el contexto de la Activity.

```kotlin
@AndroidEntryPoint
class MainActivity : ComponentActivity() { ... }
```

---

## Modelos de Datos

No se introducen nuevos modelos de datos. Los tipos existentes se mantienen:

| Tipo | Descripción | Cambio |
|------|-------------|--------|
| `StateFlow<Boolean>` | Estado de conectividad de red | Ninguno — mismo tipo expuesto por la interfaz |
| `StateFlow<String>` | Hora actual formateada | Ninguno |

La interfaz `NetworkStatusProvider` formaliza el contrato ya existente en `ConnectivityObserver.isConnected` sin introducir nuevas estructuras de datos.

---

## Cambios en Archivos de Configuración

### gradle/libs.versions.toml

Añadir en `[versions]`:
```toml
hilt = "2.51.1"
ksp = "2.0.21-1.0.28"
hiltNavigationCompose = "1.2.0"
```

Añadir en `[libraries]`:
```toml
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-android-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version.ref = "hiltNavigationCompose" }
```

Añadir en `[plugins]`:
```toml
hilt-android = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
```

### build.gradle.kts (raíz)

```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.hilt.android) apply false  // añadir
    alias(libs.plugins.ksp) apply false            // añadir
}
```

### app/build.gradle.kts

Añadir plugins:
```kotlin
alias(libs.plugins.hilt.android)
alias(libs.plugins.ksp)
```

Añadir dependencias:
```kotlin
implementation(libs.hilt.android)
ksp(libs.hilt.android.compiler)
implementation(libs.hilt.navigation.compose)
```

### AndroidManifest.xml

Añadir `android:name` en el elemento `<application>`:
```xml
<application
    android:name=".EduLabApplication"
    ...>
```

---

## Estructura de Archivos

```
app/src/main/java/com/esbot/edulab/
├── EduLabApplication.kt                    ← NUEVO
├── MainActivity.kt                         ← MODIFICADO (@AndroidEntryPoint)
├── core/
│   └── network/
│       ├── NetworkStatusProvider.kt        ← NUEVO (interfaz)
│       ├── ConnectivityObserver.kt         ← MODIFICADO (implements + @Inject)
│       └── NetworkModule.kt               ← NUEVO (módulo Hilt)
└── ui/
    └── home/
        ├── HomeViewModel.kt               ← MODIFICADO (@HiltViewModel, @Inject)
        └── HomeScreen.kt                  ← MODIFICADO (hiltViewModel())
```

---

## Propiedades de Corrección

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas de un sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas.*


### Propiedad 1: Delegación transparente de isConnected

*Para cualquier* secuencia de valores emitidos por `NetworkStatusProvider.isConnected`, `HomeViewModel.isConnected` debe emitir exactamente los mismos valores en el mismo orden, sin transformación ni filtrado.

**Valida: Requisito 5.6**

---

### Propiedad 2: Reactividad correcta ante cambios de conectividad

*Para cualquier* instancia de `NetworkStatusProvider` y cualquier secuencia de eventos de red (pérdida o recuperación), el `StateFlow<Boolean>` expuesto debe emitir `false` cuando la red se pierde y `true` cuando la red se recupera, reflejando fielmente el estado real del dispositivo.

**Valida: Requisitos 7.2, 7.3**

---

## Manejo de Errores

| Escenario | Comportamiento esperado |
|-----------|------------------------|
| `ConnectivityManager` no disponible | `hasInternet()` retorna `false`; el flow emite `false` como valor inicial |
| `NetworkCapabilities` nulas | `hasInternet()` retorna `false` de forma segura (operador `?.`) |
| Contexto de aplicación nulo | No aplica — Hilt garantiza que `@ApplicationContext` nunca es nulo |
| ViewModel solicitado sin `@AndroidEntryPoint` en la Activity | Error en tiempo de compilación generado por el procesador de Hilt |
| Versiones incompatibles de Hilt/KSP/Kotlin | Error en tiempo de compilación durante el procesamiento de anotaciones |

La lógica de manejo de errores existente en `ConnectivityObserver` (uso de `?.` y `?: return false`) se preserva sin cambios.

---

## Estrategia de Testing

### Enfoque dual

Se combinan tests unitarios (ejemplos concretos y casos borde) con tests basados en propiedades (comportamiento universal). Ambos son complementarios y necesarios.

### Tests unitarios

Cubren ejemplos concretos, casos borde y puntos de integración:

- **`HomeViewModelTest`**: Verificar que `HomeViewModel.isConnected` delega correctamente usando un `FakeNetworkStatusProvider` (implementación de test de la interfaz).
- **`HomeViewModelTest`**: Verificar que `currentTime` se actualiza después de 60 segundos usando `TestCoroutineScheduler`.
- **`NetworkModuleTest`** (test de integración Hilt): Verificar que el grafo de Hilt provee una instancia no nula de `NetworkStatusProvider` y que es de tipo `ConnectivityObserver`.

Los tests unitarios deben ser pocos y enfocados. Los tests de propiedad cubren el espacio de inputs amplio.

### Tests basados en propiedades

Librería recomendada: **Kotest Property Testing** (`io.kotest:kotest-property`), compatible con Kotlin y coroutines.

Configuración mínima: **100 iteraciones** por test de propiedad.

Cada test debe incluir un comentario de trazabilidad con el formato:
`// Feature: dependency-inversion-hilt, Property {N}: {texto de la propiedad}`

#### Test de Propiedad 1: Delegación transparente de isConnected

```kotlin
// Feature: dependency-inversion-hilt, Property 1: Delegación transparente de isConnected
@Test
fun `HomeViewModel isConnected refleja exactamente los valores del provider`() = runTest {
    checkAll(Arb.list(Arb.boolean(), 1..20)) { values ->
        val fakeProvider = FakeNetworkStatusProvider(values)
        val viewModel = HomeViewModel(fakeProvider)
        val collected = mutableListOf<Boolean>()
        val job = launch { viewModel.isConnected.take(values.size).toList(collected) }
        fakeProvider.emitAll(values)
        job.join()
        collected shouldBe values
    }
}
```

#### Test de Propiedad 2: Reactividad correcta ante cambios de conectividad

```kotlin
// Feature: dependency-inversion-hilt, Property 2: Reactividad correcta ante cambios de conectividad
@Test
fun `NetworkStatusProvider emite false al perder red y true al recuperarla`() = runTest {
    checkAll(Arb.boolean()) { initialState ->
        val fakeProvider = FakeNetworkStatusProvider(listOf(initialState))
        // Simular pérdida
        fakeProvider.emit(false)
        fakeProvider.isConnected.value shouldBe false
        // Simular recuperación
        fakeProvider.emit(true)
        fakeProvider.isConnected.value shouldBe true
    }
}
```

### Fake de test

```kotlin
class FakeNetworkStatusProvider(
    initial: Boolean = false
) : NetworkStatusProvider {
    private val _isConnected = MutableStateFlow(initial)
    override val isConnected: StateFlow<Boolean> = _isConnected

    fun emit(value: Boolean) { _isConnected.value = value }
}
```

El uso de `FakeNetworkStatusProvider` es posible precisamente porque `HomeViewModel` depende de la abstracción `NetworkStatusProvider` y no de `ConnectivityObserver` directamente — este es el beneficio central del DIP aplicado.
