# Plan de Implementación

## Tareas

- [x] 1. Definir el enum `Language` y actualizar `HomeUiState`
  - [x] 1.1 Añadir `enum class Language(val code: String) { EN("EN"), ES("ES") }` en `HomeViewModel.kt`, antes de `HomeUiState`
  - [x] 1.2 Añadir el campo `currentLanguage: Language = Language.EN` a `HomeUiState`

- [x] 2. Añadir `toggleLanguage()` en `HomeViewModel`
  - [x] 2.1 Implementar la función `toggleLanguage()` que alterna `currentLanguage` entre `Language.EN` y `Language.ES` usando `_uiState.update`

- [x] 3. Actualizar `HomeScreen` para propagar el nuevo estado
  - [x] 3.1 Pasar `currentLanguage = uiState.currentLanguage` a `HomeScreenContent`
  - [x] 3.2 Pasar `onLanguageClick = viewModel::toggleLanguage` a `HomeScreenContent`

- [x] 4. Actualizar `HomeScreenContent` para aceptar y propagar los nuevos parámetros
  - [x] 4.1 Añadir los parámetros `currentLanguage: Language` y `onLanguageClick: () -> Unit` a la firma de `HomeScreenContent`
  - [x] 4.2 Pasar `currentLanguage` y `onLanguageClick` a `EsbotTopBar` dentro del `Scaffold`

- [x] 5. Actualizar `EsbotTopBar` para mostrar el idioma activo y ser clickeable
  - [x] 5.1 Añadir los parámetros `currentLanguage: Language` y `onLanguageClick: () -> Unit` a la firma de `EsbotTopBar`
  - [x] 5.2 Reemplazar el `Icon` + `Text("EN")` estático por un `IconButton(onClick = onLanguageClick)` que contenga el ícono y `Text(currentLanguage.code)`
  - [x] 5.3 Pasar `currentLanguage` a `ConnectionBadge`

- [x] 6. Actualizar `ConnectionBadge` para mostrar texto localizado
  - [x] 6.1 Añadir el parámetro `currentLanguage: Language` a la firma de `ConnectionBadge`
  - [x] 6.2 Reemplazar el texto hardcodeado por una expresión `when(currentLanguage)` que resuelva "Connected"/"Disconnected" para EN y "Conectado"/"Desconectado" para ES

- [x] 7. Actualizar los tests en `HomeViewModelTest`
  - [x] 7.1 Añadir test: el estado inicial de `currentLanguage` es `Language.EN`
  - [x] 7.2 Añadir test: `toggleLanguage()` cambia `Language.EN` → `Language.ES`
  - [x] 7.3 Añadir test: `toggleLanguage()` cambia `Language.ES` → `Language.EN`
  - [x] 7.4 Añadir test: invocar `toggleLanguage()` dos veces consecutivas restaura el idioma original (round-trip)
