# Documento de Diseño

## Introducción

Este documento describe el diseño técnico para implementar el soporte de múltiples idiomas (EN/ES) en la aplicación EduLab. El enfoque es **programático**: el idioma se gestiona como estado en `HomeUiState` y los textos localizados se resuelven en los composables según el valor de `Language`. No se usa el sistema de recursos `res/values-es/` para evitar recomposición forzada de toda la Activity.

## Arquitectura

El flujo de datos sigue el patrón unidireccional (UDF) ya establecido en la app:

```
HomeViewModel (toggleLanguage) 
    → _uiState.update { it.copy(currentLanguage = ...) }
    → HomeScreen (collectAsState)
    → HomeScreenContent (props)
    → EsbotTopBar / ConnectionBadge (props)
```

## Componentes

### 1. Enum `Language`

Ubicación: `ui/home/HomeViewModel.kt` (junto a `HomeUiState`, en el mismo archivo).

```kotlin
enum class Language(val code: String) {
    EN("EN"),
    ES("ES")
}
```

### 2. `HomeUiState` — campo `currentLanguage`

Se añade el campo con valor por defecto `Language.EN`:

```kotlin
data class HomeUiState(
    val isConnected: Boolean = false,
    val currentTime: String = "",
    val currentLanguage: Language = Language.EN
)
```

### 3. `HomeViewModel` — función `toggleLanguage()`

```kotlin
fun toggleLanguage() {
    _uiState.update { state ->
        val next = if (state.currentLanguage == Language.EN) Language.ES else Language.EN
        state.copy(currentLanguage = next)
    }
}
```

### 4. `HomeScreen` — propagación del estado

```kotlin
HomeScreenContent(
    isConnected = uiState.isConnected,
    currentTime = uiState.currentTime,
    currentLanguage = uiState.currentLanguage,
    onLanguageClick = viewModel::toggleLanguage
)
```

### 5. `HomeScreenContent` — nuevos parámetros

```kotlin
fun HomeScreenContent(
    isConnected: Boolean,
    currentTime: String,
    currentLanguage: Language,
    onLanguageClick: () -> Unit
)
```

Pasa `currentLanguage` y `onLanguageClick` a `EsbotTopBar`.

### 6. `EsbotTopBar` — nuevos parámetros

```kotlin
fun EsbotTopBar(
    currentTime: String,
    isConnected: Boolean,
    currentLanguage: Language,
    onMenuClick: () -> Unit,
    onLanguageClick: () -> Unit
)
```

El selector de idioma se convierte en un `IconButton` que envuelve el ícono y el texto:

```kotlin
IconButton(onClick = onLanguageClick) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Default.Language, contentDescription = null)
        Spacer(modifier = Modifier.width(4.dp))
        Text(text = currentLanguage.code)
    }
}
```

### 7. `ConnectionBadge` — nuevo parámetro `currentLanguage`

```kotlin
fun ConnectionBadge(isConnected: Boolean, currentLanguage: Language)
```

Resolución del texto:

```kotlin
val text = when (currentLanguage) {
    Language.EN -> if (isConnected) "Connected" else "Disconnected"
    Language.ES -> if (isConnected) "Conectado" else "Desconectado"
}
```

## Impacto en tests existentes

`HomeViewModelTest` deberá actualizarse para:
- Verificar el valor inicial de `currentLanguage` (`Language.EN`).
- Verificar que `toggleLanguage()` alterna correctamente entre `EN` y `ES`.
- Verificar la propiedad de doble alternancia (round-trip).

## Decisiones de diseño

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Enum `Language` con propiedad `code` | `Boolean isEnglish` | Más extensible, semánticamente claro |
| Textos resueltos en composable | `res/values-es/strings.xml` | Evita recrear la Activity; el estado vive en el ViewModel |
| `IconButton` envolviendo ícono + texto | `Modifier.clickable` en `Row` | Área táctil estándar de Material3, accesibilidad correcta |
