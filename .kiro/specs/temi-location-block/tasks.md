# Implementation Plan: temi-location-block

## Overview

Reemplazar el bloque Blockly `temi_move` ("avanzar N pasos") por un bloque "ir a [ubicación ▼]" con dropdown de ubicaciones reales del mapa del robot Temi V3. El plan cubre: servidor HTTP embebido en Android, consulta de ubicaciones desde la Web App, redefinición del bloque Blockly, actualización de `mission-program.ts` y verificación de la ejecución del `Navigate_Command` en la Temi_App.

## Tasks

- [ ] 1. Crear `LocationHttpServer` en la app Android
  - Crear `apps/robot-temi/app/src/main/java/com/esbot/edulab/robot/runtime/LocationHttpServer.kt`
  - Usar `com.sun.net.httpserver.HttpServer` en el puerto 8765
  - El handler lee `dao.getLocations()`, filtra `available = true` y serializa a `{"locations": [...]}` con la función de extensión `List<String>.toLocationsJson()`
  - Incluir cabecera `Access-Control-Allow-Origin: *` y `Content-Type: application/json` en todas las respuestas
  - Responder HTTP 404 para paths desconocidos; capturar excepciones del DAO y responder `{"locations": []}` con HTTP 200 logueando con `Log.w`
  - Exponer métodos `start()` y `stop()`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.1 Escribir property test P1: serialización JSON solo incluye ubicaciones disponibles
    - Usar Kotest Property Testing con listas aleatorias de `MapLocationEntity` con `available` aleatorio
    - Verificar que el JSON producido solo contiene nombres con `available = true`
    - **Property 1: Serialización JSON solo incluye ubicaciones disponibles**
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 1.2 Escribir unit test: cabecera CORS presente en la respuesta
    - Iniciar el servidor, hacer petición GET `/locations`, verificar `Access-Control-Allow-Origin: *`
    - _Requirements: 1.4_

- [ ] 2. Integrar `LocationHttpServer` en `MissionRuntimeEngine` y `AppContainer`
  - Modificar `MissionRuntimeEngine` para recibir `LocationHttpServer` como parámetro en el constructor
  - Llamar a `locationServer.start()` en `boot()` y `locationServer.stop()` en `resetToStandby()`
  - Modificar `AppContainer` para instanciar `LocationHttpServer(database.robotDao())` y pasarlo al `MissionRuntimeEngine`
  - _Requirements: 1.1, 1.5_

  - [ ]* 2.1 Escribir property test P2: el servidor refleja el estado actual de la base de datos
    - Usar Kotest PBT con dos listas distintas A y B
    - Verificar que tras actualizar la DB a B, la siguiente petición retorna B
    - **Property 2: El servidor refleja el estado actual de la base de datos**
    - **Validates: Requirements 1.5**

- [ ] 3. Checkpoint — Verificar que la app Android compila y los tests pasan
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Agregar `fetchRobotLocations` en `src/lib/robot-adapter.ts`
  - Añadir la constante `ROBOT_API_URL` usando `process.env.NEXT_PUBLIC_ROBOT_API_URL ?? "http://localhost:8765"`
  - Añadir la constante `FALLBACK_LOCATIONS = ["Sala Principal"]`
  - Implementar `fetchRobotLocations(): Promise<string[]>` con timeout de 3000 ms usando `AbortController`
  - Retornar `FALLBACK_LOCATIONS` en cualquier caso de error (timeout, red, JSON malformado, lista vacía)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 4.1 Escribir property test P3: ubicaciones de la API se almacenan íntegramente en el estado del componente
    - Usar fast-check con arrays de strings no vacíos
    - Mockear `fetch` para retornar el array generado; verificar que el estado del componente iguala el array
    - **Property 3: Las ubicaciones de la API se almacenan íntegramente en el estado del componente**
    - **Validates: Requirements 2.3**

  - [ ]* 4.2 Escribir unit tests para `fetchRobotLocations`
    - Test: fetch exitoso retorna la lista de la API
    - Test: timeout (> 3000 ms) retorna `FALLBACK_LOCATIONS`
    - Test: error de red retorna `FALLBACK_LOCATIONS`
    - Test: lista vacía en respuesta retorna `FALLBACK_LOCATIONS`
    - Test: URL construida desde `NEXT_PUBLIC_ROBOT_API_URL`
    - _Requirements: 2.1, 2.2, 2.4_

- [ ] 5. Redefinir el bloque `temi_move` en `BlocklyWorkspace` con `field_dropdown`
  - Modificar `defineTemiBlocks` en `src/components/blockly-workspace.tsx` para aceptar un parámetro `locations: string[]`
  - Reemplazar la definición de `temi_move`: `message0: "ir a %1"`, `args0[0]` de tipo `field_dropdown` con nombre `LOCATION` y opciones `locations.map(l => [l, l])`
  - Si `locations` está vacío, usar `[["Sala Principal", "Sala Principal"]]` como opciones
  - Eliminar el texto "pasos" y el campo `field_number` `STEPS`
  - En el `useEffect` de inicialización, llamar a `fetchRobotLocations()` antes de `defineTemiBlocks` y pasar el resultado
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 5.1 Escribir property test P4: el dropdown refleja exactamente la lista de ubicaciones
    - Usar fast-check con arrays de strings de longitud N ≥ 1
    - Verificar que el `field_dropdown` tiene exactamente N opciones con los valores correctos
    - **Property 4: El dropdown refleja exactamente la lista de ubicaciones**
    - **Validates: Requirements 3.2**

  - [ ]* 5.2 Escribir unit tests para la redefinición del bloque `temi_move`
    - Test: `message0 === "ir a %1"`, `args0[0].type === "field_dropdown"`, `args0[0].name === "LOCATION"`
    - Test: fallback `[["Sala Principal", "Sala Principal"]]` cuando la lista está vacía
    - _Requirements: 3.1, 3.3_

- [ ] 6. Actualizar `mission-program.ts` para el nuevo bloque `temi_move`
  - En `src/lib/mission-program.ts`, cambiar el entry de `temi_move` en `orderStepsProgram`:
    - `label`: `"Avanzar 2 pasos"` → `"Ir a ubicación"`
    - `helper`: actualizar a `"Haz que Temi navegue a una ubicación del mapa."`
  - Actualizar la lógica de evaluación en `evaluateOrderSteps` para leer el campo `LOCATION` del bloque `temi_move` y generar un paso de tipo `Navigate` con `primaryValue` igual al nombre de la ubicación
  - Si el campo `LOCATION` está vacío o ausente, omitir el paso y llamar a `console.warn`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 6.1 Escribir property test P6: campo LOCATION genera Navigate con primaryValue correcto
    - Usar fast-check con strings no vacíos como nombre de ubicación
    - Verificar que el paso generado tiene `type === "Navigate"` y `primaryValue` igual al string de entrada
    - **Property 6: Extracción del campo LOCATION genera Navigate con primaryValue correcto**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 6.2 Escribir unit tests para `mission-program.ts`
    - Test: `orderStepsProgram[1].label === "Ir a ubicación"`
    - Test: campo `LOCATION` vacío omite el paso y llama `console.warn`
    - _Requirements: 4.3, 4.4_

- [ ] 7. Verificar la serialización y deserialización del workspace con el nuevo bloque
  - Confirmar que el `try/catch` existente en `loadBlockly` captura workspaces con el formato antiguo (`STEPS`) sin lanzar excepción
  - No se requieren cambios de código adicionales; este task valida el comportamiento existente con el nuevo bloque
  - _Requirements: 6.1, 6.2, 6.4_

  - [ ]* 7.1 Escribir property test P5: round-trip de serialización preserva LOCATION
    - Usar fast-check con strings de nombres de ubicación válidos
    - Verificar que `save()` → `load()` produce un bloque `temi_move` con el mismo valor en `LOCATION`
    - **Property 5: Round-trip de serialización del workspace preserva LOCATION**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 7.2 Escribir unit test: workspace con formato antiguo (STEPS) no lanza excepción
    - Cargar un JSON con `"fields": { "STEPS": 2 }`, verificar que no se lanza excepción
    - _Requirements: 6.4_

- [ ] 8. Verificar la ejecución del `Navigate_Command` en `MissionRuntimeEngine`
  - Confirmar que `executeNavigate` en `MissionRuntimeEngine.kt` ya implementa correctamente la búsqueda por nombre (case-insensitive) y los casos de error
  - No se requieren cambios funcionales; este task valida el comportamiento existente contra los requisitos
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 8.1 Escribir property test P7: lookup de ubicación en executeNavigate es correcto
    - Usar Kotest PBT con listas de `MapLocationEntity` y nombres aleatorios
    - Verificar que `bridge.goTo` se llama si y solo si existe una entidad con ese nombre (case-insensitive) y `available = true`; en caso contrario se llama `showRecoverableError` con `studentCanResolve = false, autoRetryPlanned = false`
    - **Property 7: Lookup de ubicación en executeNavigate es correcto**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 8.2 Escribir unit test: `bridge.goTo` fallido llama `showRecoverableError` con `autoRetryPlanned = true`
    - _Requirements: 5.4_

- [ ] 9. Checkpoint final — Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- `executeNavigate` en `MissionRuntimeEngine` ya implementa la lógica correcta (Req 5); las tareas 8 y 8.1/8.2 son de validación
- Los property tests usan **Kotest Property Testing** (Android/Kotlin) y **fast-check** (TypeScript/Web)
- La compatibilidad hacia atrás con workspaces en formato antiguo (`STEPS`) está cubierta por el `try/catch` existente en `loadBlockly`
