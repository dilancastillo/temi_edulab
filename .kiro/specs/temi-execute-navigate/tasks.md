# Tasks: temi-execute-navigate

## Task List

- [x] 1. Extender `robot-adapter.ts` con `executeRobotCommands`
  - [x] 1.1 Añadir el tipo `NavigateCommand` y `RobotExecuteCommand` al adapter
  - [x] 1.2 Implementar `executeRobotCommands(commands)` con POST a `/execute` y timeout de 5s
  - [x] 1.3 Añadir `extractLocationFromWorkspace(workspaceState)` para extraer el campo `LOCATION` del bloque `temi_move`

- [x] 2. Crear el componente `ExecuteButton` en la web
  - [x] 2.1 Crear `src/components/execute-button.tsx` con props `workspaceState`, `sequence`, `disabled`
  - [x] 2.2 Deshabilitar el botón cuando `sequence` no contiene `"temi_move"`
  - [x] 2.3 Mostrar estado de carga mientras espera respuesta del robot
  - [x] 2.4 Mostrar mensaje de éxito o error según `RobotRunResult`

- [x] 3. Integrar `ExecuteButton` en las pantallas del editor
  - [x] 3.1 Añadir `ExecuteButton` en `StudentFreePlayScreen` (pasar `workspaceState` y `sequence`)
  - [x] 3.2 Añadir `ExecuteButton` en `StudentMissionScreen` (pasar `workspaceState` y `sequence`)

- [x] 4. Crear `RobotReflectionRunner` en Android
  - [x] 4.1 Crear interfaz `RobotCommandRunner` en `core/robot/`
  - [x] 4.2 Implementar `RobotReflectionRunner` con `run(Navigate)` usando reflexión sobre `Robot.goTo`
  - [x] 4.3 Registrar `RobotReflectionRunner` en `RobotModule` con Hilt

- [x] 5. Extender `TemiLocationServer` con el endpoint `POST /execute`
  - [x] 5.1 Añadir parsing del body JSON para `POST /execute` en `handleClient`
  - [x] 5.2 Delegar en `RobotReflectionRunner` para ejecutar el comando Navigate
  - [x] 5.3 Responder `200`, `400` o `500` según corresponda con header CORS
  - [x] 5.4 Ignorar comandos de tipo desconocido (forward-compatibility)

- [x] 6. Tests web
  - [x] 6.1 Unit test de `extractLocationFromWorkspace` (con bloque, sin bloque, campo vacío)
  - [x] 6.2 Unit test de `executeRobotCommands` (mock fetch: éxito, timeout, error HTTP)
  - [x] 6.3 Unit test de `ExecuteButton` (deshabilitado sin temi_move, feedback de éxito/error)

- [-] 7. Tests Android
  - [ ] 7.1 Unit test de `RobotReflectionRunner` (getInstance null, reflexión exitosa, reflexión fallida)
  - [ ] 7.2 Unit test del handler `POST /execute` (body válido, body malformado, tipo desconocido)
