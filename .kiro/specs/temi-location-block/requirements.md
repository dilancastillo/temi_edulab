# Requirements Document

## Introduction

Esta feature reemplaza el bloque Blockly `temi_move` (que actualmente muestra "avanzar [N] pasos") por un bloque de navegación a ubicación real del mapa del robot Temi V3. El nuevo bloque mostrará un dropdown con las ubicaciones reales cargadas en el robot, con la forma "ir a [Sala Principal ▼]".

Para lograrlo se requiere un canal de comunicación nuevo entre la app Android (`apps/robot-temi`) y la app web (Next.js): la app Android expone las ubicaciones disponibles del mapa a través de un endpoint HTTP local, y la app web las consulta para poblar el dropdown del bloque.

## Glossary

- **Temi_App**: La aplicación Android que corre en el robot Temi V3 (`apps/robot-temi`).
- **Web_App**: La aplicación Next.js que sirve la interfaz de programación Blockly.
- **Location_Server**: Servidor HTTP embebido en la Temi_App que expone las ubicaciones del mapa.
- **Location_API**: Endpoint REST que sirve la lista de ubicaciones en formato JSON.
- **Blockly_Workspace**: El componente React `BlocklyWorkspace` en `src/components/blockly-workspace.tsx`.
- **temi_move_block**: El bloque Blockly de tipo `temi_move` que representa una instrucción de navegación.
- **Location_Dropdown**: El campo `field_dropdown` dentro del `temi_move_block` que lista las ubicaciones disponibles.
- **MapLocationEntity**: Entidad Room en la Temi_App que almacena las ubicaciones del mapa con nombre y disponibilidad.
- **MissionProgram**: El módulo `src/lib/mission-program.ts` que evalúa la secuencia de bloques del programa del estudiante.
- **Navigate_Command**: El comando de tipo `NAVIGATE` en la cola de ejecución de la Temi_App, cuyo `primaryValue` es el nombre de la ubicación destino.

---

## Requirements

### Requirement 1: Servidor HTTP de ubicaciones en la app Android

**User Story:** Como desarrollador de la Web_App, quiero consultar las ubicaciones del mapa del robot desde la app web, para poder poblar el dropdown del bloque de navegación con datos reales.

#### Acceptance Criteria

1. THE Location_Server SHALL escuchar peticiones HTTP en el puerto 8765 del dispositivo Android mientras la Temi_App esté en ejecución.
2. WHEN la Web_App realiza una petición GET a `http://<robot-ip>:8765/locations`, THE Location_API SHALL responder con un JSON de la forma `{"locations": ["Nombre1", "Nombre2", ...]}` con las ubicaciones marcadas como `available = true` en la base de datos Room.
3. IF la base de datos Room no contiene ubicaciones disponibles, THEN THE Location_API SHALL responder con `{"locations": []}` y código HTTP 200.
4. THE Location_Server SHALL incluir la cabecera `Access-Control-Allow-Origin: *` en todas las respuestas para permitir peticiones desde la Web_App.
5. WHEN la Temi_App llama a `refreshDiagnostics()`, THE Location_Server SHALL servir las ubicaciones actualizadas en la siguiente petición a la Location_API.

---

### Requirement 2: Consulta de ubicaciones desde la Web_App

**User Story:** Como Web_App, quiero obtener la lista de ubicaciones del robot al cargar el editor Blockly, para que el dropdown del bloque `temi_move` muestre opciones reales.

#### Acceptance Criteria

1. WHEN el Blockly_Workspace se inicializa, THE Web_App SHALL intentar obtener la lista de ubicaciones desde la Location_API mediante una petición HTTP GET.
2. IF la petición a la Location_API falla o supera 3000 ms sin respuesta, THEN THE Web_App SHALL usar una lista de ubicaciones de respaldo definida localmente con al menos una entrada (`["Sala Principal"]`).
3. WHEN la Location_API responde con una lista de ubicaciones no vacía, THE Web_App SHALL almacenar esa lista en el estado local del componente para usarla en el Location_Dropdown.
4. THE Web_App SHALL exponer la URL base de la Location_API como variable de entorno `NEXT_PUBLIC_ROBOT_API_URL`, con valor por defecto `http://localhost:8765`.

---

### Requirement 3: Rediseño del bloque `temi_move` con dropdown de ubicaciones

**User Story:** Como estudiante, quiero ver un dropdown con las ubicaciones reales del mapa en el bloque de movimiento, para poder programar a Temi para que vaya a un lugar específico.

#### Acceptance Criteria

1. THE Blockly_Workspace SHALL definir el `temi_move_block` con el mensaje `"ir a %1"` y un campo `field_dropdown` de nombre `LOCATION` en lugar del campo `field_number` de nombre `STEPS`.
2. WHEN las ubicaciones obtenidas de la Location_API están disponibles, THE Location_Dropdown SHALL mostrar una opción por cada ubicación de la lista.
3. IF la lista de ubicaciones está vacía o no se pudo obtener, THEN THE Location_Dropdown SHALL mostrar la opción de respaldo `[["Sala Principal", "Sala Principal"]]`.
4. THE `temi_move_block` SHALL eliminar el texto "pasos" del mensaje del bloque.
5. WHEN el estudiante selecciona una ubicación en el Location_Dropdown, THE Blockly_Workspace SHALL incluir el nombre de esa ubicación en el estado serializado del workspace.

---

### Requirement 4: Generación del Navigate_Command desde el bloque `temi_move`

**User Story:** Como MissionProgram, quiero leer el nombre de la ubicación seleccionada en el bloque `temi_move`, para generar el Navigate_Command correcto que ejecutará la Temi_App.

#### Acceptance Criteria

1. WHEN el MissionProgram evalúa un bloque de tipo `temi_move`, THE MissionProgram SHALL leer el campo `LOCATION` del bloque para obtener el nombre de la ubicación destino.
2. THE MissionProgram SHALL generar un paso de tipo `Navigate` con `primaryValue` igual al nombre de la ubicación leída del campo `LOCATION`.
3. IF el campo `LOCATION` del bloque `temi_move` está vacío o ausente, THEN THE MissionProgram SHALL omitir ese paso y registrar una advertencia en consola.
4. THE MissionProgram SHALL actualizar la descripción del paso `temi_move` en `orderStepsProgram` de `"Avanzar 2 pasos"` a `"Ir a ubicación"`.

---

### Requirement 5: Ejecución del Navigate_Command en la Temi_App

**User Story:** Como Temi_App, quiero recibir un Navigate_Command con el nombre de una ubicación real del mapa, para navegar físicamente hasta ese lugar usando el SDK de Temi.

#### Acceptance Criteria

1. WHEN la Temi_App procesa un Navigate_Command, THE MissionRuntimeEngine SHALL buscar la ubicación por nombre en la lista de `MapLocationEntity` con `available = true`.
2. IF el nombre del Navigate_Command no coincide con ninguna `MapLocationEntity` disponible, THEN THE MissionRuntimeEngine SHALL llamar a `showRecoverableError` con `studentCanResolve = false` y `autoRetryPlanned = false`.
3. WHEN la ubicación es encontrada y está disponible, THE MissionRuntimeEngine SHALL invocar `bridge.goTo(locationName)` con el nombre exacto de la `MapLocationEntity`.
4. THE MissionRuntimeEngine SHALL mantener el comportamiento actual de manejo de errores de navegación (llamar a `showRecoverableError` con `autoRetryPlanned = true` si `bridge.goTo` falla).

---

### Requirement 6: Parser y serialización del workspace con el nuevo bloque

**User Story:** Como Web_App, quiero que el workspace Blockly serialice y deserialice correctamente el bloque `temi_move` con el campo `LOCATION`, para que las misiones guardadas sean compatibles con el nuevo formato.

#### Acceptance Criteria

1. THE Blockly_Workspace SHALL serializar el estado del workspace incluyendo el valor del campo `LOCATION` del `temi_move_block` en el JSON de estado.
2. WHEN se carga un workspace serializado que contiene un `temi_move_block` con campo `LOCATION`, THE Blockly_Workspace SHALL restaurar el dropdown con la ubicación previamente seleccionada.
3. FOR ALL workspaces válidos que contengan un `temi_move_block`, serializar y luego deserializar el workspace SHALL producir un bloque con el mismo valor en el campo `LOCATION` (propiedad de round-trip).
4. IF se carga un workspace serializado con el formato antiguo (campo `STEPS` en lugar de `LOCATION`), THEN THE Blockly_Workspace SHALL ignorar el bloque incompatible sin lanzar una excepción, manteniendo el comportamiento actual del bloque `try/catch` en `loadBlockly`.
