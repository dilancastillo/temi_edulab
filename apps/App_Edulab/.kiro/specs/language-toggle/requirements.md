# Documento de Requisitos

## Introducción

Esta funcionalidad añade soporte de múltiples idiomas (inglés y español) a la aplicación Android EduLab con Jetpack Compose. El usuario puede alternar entre idiomas desde la TopBar. El idioma activo se refleja en la TopBar y en los textos de la UI, comenzando por el badge de conexión.

## Glosario

- **App**: La aplicación Android EduLab.
- **HomeViewModel**: ViewModel con anotación `@HiltViewModel` que gestiona el estado de la pantalla principal mediante `StateFlow<HomeUiState>`.
- **HomeUiState**: Data class que representa el estado observable de la pantalla principal.
- **HomeScreen**: Composable raíz que observa el `HomeUiState` y delega la renderización a `HomeScreenContent`.
- **HomeScreenContent**: Composable de presentación que recibe props y compone la pantalla principal.
- **EsbotTopBar**: Composable de la barra superior que muestra la hora, el selector de idioma y el badge de conexión.
- **ConnectionBadge**: Composable que muestra el estado de conexión con texto localizado.
- **Language**: Enumeración que representa el idioma activo. Valores: `EN` (inglés) y `ES` (español).
- **toggleLanguage**: Función del `HomeViewModel` que alterna el idioma activo entre `EN` y `ES`.

## Requisitos

### Requisito 1: Estado del idioma en HomeUiState

**User Story:** Como desarrollador, quiero que el idioma activo forme parte del estado unificado de la UI, para que la arquitectura MVVM con StateFlow gestione el idioma de forma consistente con el resto del estado.

#### Criterios de Aceptación

1. THE `HomeUiState` SHALL contener un campo `currentLanguage` de tipo `Language` con valor por defecto `Language.EN`.
2. WHEN el campo `currentLanguage` cambia, THE `HomeUiState` SHALL reflejar el nuevo valor en el `StateFlow` expuesto por `HomeViewModel`.

---

### Requisito 2: Alternancia de idioma en HomeViewModel

**User Story:** Como usuario, quiero presionar el selector de idioma en la TopBar para cambiar el idioma de la aplicación, para que la interfaz se muestre en el idioma que prefiero.

#### Criterios de Aceptación

1. THE `HomeViewModel` SHALL exponer una función `toggleLanguage()` que no recibe parámetros.
2. WHEN `toggleLanguage()` es invocada y `currentLanguage` es `Language.EN`, THE `HomeViewModel` SHALL actualizar `currentLanguage` a `Language.ES`.
3. WHEN `toggleLanguage()` es invocada y `currentLanguage` es `Language.ES`, THE `HomeViewModel` SHALL actualizar `currentLanguage` a `Language.EN`.
4. WHEN `toggleLanguage()` es invocada dos veces consecutivas, THE `HomeViewModel` SHALL restaurar `currentLanguage` al valor original (propiedad de idempotencia de doble alternancia).

---

### Requisito 3: Propagación del idioma desde HomeScreen hasta EsbotTopBar

**User Story:** Como desarrollador, quiero que el idioma activo y el callback de alternancia fluyan desde `HomeScreen` hasta `EsbotTopBar` a través de `HomeScreenContent`, para mantener el flujo de datos unidireccional propio de Jetpack Compose.

#### Criterios de Aceptación

1. THE `HomeScreen` SHALL pasar `uiState.currentLanguage` y `viewModel::toggleLanguage` a `HomeScreenContent`.
2. THE `HomeScreenContent` SHALL aceptar los parámetros `currentLanguage: Language` y `onLanguageClick: () -> Unit` y pasarlos a `EsbotTopBar`.
3. THE `EsbotTopBar` SHALL aceptar los parámetros `currentLanguage: Language` y `onLanguageClick: () -> Unit`.

---

### Requisito 4: Visualización del idioma activo en EsbotTopBar

**User Story:** Como usuario, quiero ver el código del idioma activo ("EN" o "ES") junto al ícono de idioma en la TopBar, para saber en qué idioma está configurada la aplicación.

#### Criterios de Aceptación

1. WHEN `currentLanguage` es `Language.EN`, THE `EsbotTopBar` SHALL mostrar el texto `"EN"` junto al ícono de idioma.
2. WHEN `currentLanguage` es `Language.ES`, THE `EsbotTopBar` SHALL mostrar el texto `"ES"` junto al ícono de idioma.
3. WHEN el usuario presiona el área del ícono de idioma o el texto del idioma, THE `EsbotTopBar` SHALL invocar `onLanguageClick`.

---

### Requisito 5: Localización del texto en ConnectionBadge

**User Story:** Como usuario, quiero que el badge de conexión muestre el texto en el idioma activo, para que la información de estado sea comprensible en mi idioma preferido.

#### Criterios de Aceptación

1. WHEN `currentLanguage` es `Language.EN` y el dispositivo está conectado, THE `ConnectionBadge` SHALL mostrar el texto `"Connected"`.
2. WHEN `currentLanguage` es `Language.EN` y el dispositivo no está conectado, THE `ConnectionBadge` SHALL mostrar el texto `"Disconnected"`.
3. WHEN `currentLanguage` es `Language.ES` y el dispositivo está conectado, THE `ConnectionBadge` SHALL mostrar el texto `"Conectado"`.
4. WHEN `currentLanguage` es `Language.ES` y el dispositivo no está conectado, THE `ConnectionBadge` SHALL mostrar el texto `"Desconectado"`.
5. THE `ConnectionBadge` SHALL aceptar el parámetro `currentLanguage: Language` para determinar el texto a mostrar.

---

### Requisito 6: Definición del tipo Language

**User Story:** Como desarrollador, quiero un tipo `Language` bien definido en el dominio de la UI, para que el compilador garantice que solo se usen valores válidos de idioma en toda la aplicación.

#### Criterios de Aceptación

1. THE `App` SHALL definir un tipo `Language` como `enum class` con exactamente dos valores: `EN` y `ES`.
2. THE `Language` SHALL exponer una propiedad `code: String` que retorna `"EN"` para `Language.EN` y `"ES"` para `Language.ES`.
3. IF un valor de `Language` no reconocido es utilizado en tiempo de compilación, THEN THE compilador SHALL emitir un error de tipo.
