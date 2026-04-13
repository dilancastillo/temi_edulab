# Requirements: temi-execute-navigate

## Introduction

Esta feature permite a los estudiantes ejecutar su programa Blockly directamente en el robot Temi desde el editor web. Al presionar "Ejecutar en robot", la web extrae el bloque `temi_move` del workspace, construye un comando `Navigate` y lo envía vía HTTP POST al robot. La app Android recibe el comando y llama a `robot.goTo(...)` usando reflexión sobre el SDK de Temi. El alcance de esta iteración es exclusivamente el bloque `temi_move` (Navigate).

---

## Requirements

### Requirement 1: Botón "Ejecutar en robot" en el editor

**User Story**: Como estudiante, quiero un botón "Ejecutar en robot" debajo del editor Blockly, para poder probar mi programa directamente en el robot Temi sin salir del editor.

#### Acceptance Criteria

1. GIVEN que el estudiante está en la pantalla del editor Blockly (misión o juego libre), WHEN se renderiza la página, THEN se muestra un botón "Ejecutar en robot" debajo del componente `BlocklyWorkspace`.

2. GIVEN que la secuencia del workspace no contiene el bloque `temi_move`, WHEN se renderiza el botón, THEN el botón está deshabilitado (`disabled`).

3. GIVEN que la secuencia del workspace contiene al menos un bloque `temi_move`, WHEN se renderiza el botón, THEN el botón está habilitado.

4. GIVEN que el botón está habilitado y el estudiante hace click, WHEN se procesa el click, THEN el botón muestra un estado de carga (spinner o texto "Ejecutando...") mientras espera la respuesta del robot.

5. GIVEN que la llamada al robot devuelve `ok: true`, WHEN se recibe la respuesta, THEN se muestra un mensaje de éxito al estudiante y el botón vuelve a su estado normal.

6. GIVEN que la llamada al robot devuelve `ok: false`, WHEN se recibe la respuesta, THEN se muestra el mensaje de error al estudiante y el botón vuelve a su estado normal.

---

### Requirement 2: Extracción de ubicación desde el workspace Blockly

**User Story**: Como sistema, necesito extraer la ubicación seleccionada en el bloque `temi_move` del workspace serializado de Blockly, para construir el comando Navigate correcto.

#### Acceptance Criteria

1. GIVEN un `workspaceState` serializado que contiene un bloque `temi_move` con el campo `LOCATION` configurado, WHEN se llama a `extractLocationFromWorkspace(workspaceState)`, THEN se devuelve el string de la ubicación.

2. GIVEN un `workspaceState` que no contiene ningún bloque `temi_move`, WHEN se llama a `extractLocationFromWorkspace(workspaceState)`, THEN se devuelve `null` o string vacío.

3. GIVEN un `workspaceState` con un bloque `temi_move` cuyo campo `LOCATION` está vacío, WHEN se llama a `extractLocationFromWorkspace(workspaceState)`, THEN se devuelve `null` o string vacío.

4. GIVEN cualquier `workspaceState` válido o inválido, WHEN se llama a `extractLocationFromWorkspace`, THEN la función nunca lanza una excepción (siempre devuelve un valor o null).

---

### Requirement 3: Envío del comando Navigate al robot vía HTTP

**User Story**: Como sistema web, necesito enviar el comando Navigate al robot Temi vía HTTP POST, para que el robot ejecute el movimiento programado por el estudiante.

#### Acceptance Criteria

1. GIVEN una ubicación válida extraída del workspace, WHEN se llama a `executeRobotCommands([{type: "Navigate", location}])`, THEN se realiza un HTTP POST a `${ROBOT_API_URL}/execute` con body `{"commands":[{"type":"Navigate","location":"<location>"}]}` y `Content-Type: application/json`.

2. GIVEN que el robot responde con HTTP 200 y `{"ok":true,"message":"..."}`, WHEN se recibe la respuesta, THEN `executeRobotCommands` devuelve `{ok: true, message: "..."}`.

3. GIVEN que la conexión al robot falla o supera 5 segundos, WHEN ocurre el timeout, THEN `executeRobotCommands` devuelve `{ok: false, message: "Robot no disponible"}` sin lanzar excepción.

4. GIVEN que el robot responde con HTTP 4xx o 5xx, WHEN se recibe la respuesta, THEN `executeRobotCommands` devuelve `{ok: false, message: "..."}` sin lanzar excepción.

5. GIVEN cualquier condición de red (éxito, error, timeout, respuesta inesperada), WHEN se llama a `executeRobotCommands`, THEN la función siempre devuelve un `RobotRunResult` y nunca lanza una excepción no controlada.

---

### Requirement 4: Endpoint POST /execute en la app Android

**User Story**: Como app Android del robot, necesito exponer un endpoint `POST /execute` en el servidor HTTP del puerto 8765, para recibir y procesar comandos de navegación enviados desde la web.

#### Acceptance Criteria

1. GIVEN que el servidor HTTP del robot está corriendo en el puerto 8765, WHEN llega un `POST /execute` con body `{"commands":[{"type":"Navigate","location":"<location>"}]}`, THEN el servidor parsea el body y despacha el comando Navigate.

2. GIVEN un body JSON válido con al menos un comando Navigate, WHEN se procesa la request, THEN el servidor responde `200 {"ok":true,"message":"Navigate dispatched"}`.

3. GIVEN un body JSON malformado o vacío, WHEN llega la request, THEN el servidor responde `400 {"ok":false,"message":"Bad request"}`.

4. GIVEN que el array `commands` contiene tipos de comando desconocidos (ej. `"Say"`, `"Show"`), WHEN se procesa la request, THEN los comandos desconocidos se ignoran sin error y el servidor responde `200 {"ok":true,"message":"Navigate dispatched"}` si al menos un Navigate fue procesado.

5. GIVEN cualquier respuesta del servidor, WHEN se envía la respuesta HTTP, THEN incluye el header `Access-Control-Allow-Origin: *`.

---

### Requirement 5: Ejecución de goTo en el SDK de Temi vía reflexión

**User Story**: Como app Android, necesito llamar a `robot.goTo(location, ...)` usando reflexión sobre el SDK de Temi, para mover el robot a la ubicación indicada sin depender de una referencia directa al SDK en tiempo de compilación.

#### Acceptance Criteria

1. GIVEN una ubicación válida no vacía, WHEN se llama a `RobotReflectionRunner.run(Navigate(location))`, THEN se invoca `Robot.getInstance().goTo(location, false, false, SpeedLevel.MEDIUM, false, false)` vía reflexión.

2. GIVEN que `Robot.getInstance()` devuelve null, WHEN se llama a `RobotReflectionRunner.run(Navigate(location))`, THEN se devuelve `Result.failure(IllegalStateException)` sin lanzar excepción no controlada.

3. GIVEN que la reflexión falla por cualquier motivo (método no encontrado, clase no encontrada, etc.), WHEN se llama a `RobotReflectionRunner.run(Navigate(location))`, THEN se devuelve `Result.failure(exception)` sin lanzar excepción no controlada.

4. GIVEN cualquier string `location` (vacío, con caracteres especiales, largo), WHEN se llama a `RobotReflectionRunner.run(Navigate(location))`, THEN la función siempre devuelve `Result.success(Unit)` o `Result.failure(...)` y nunca lanza una excepción no controlada.

5. GIVEN que `goTo` se invoca correctamente, WHEN el SDK acepta el comando, THEN el servidor HTTP responde inmediatamente sin esperar a que el robot llegue al destino (el movimiento es asíncrono).

---

### Requirement 6: Integración con el servidor HTTP existente

**User Story**: Como desarrollador, necesito que el nuevo endpoint `/execute` coexista con el endpoint `/locations` existente en el mismo servidor HTTP del puerto 8765, para no duplicar infraestructura.

#### Acceptance Criteria

1. GIVEN que el servidor HTTP está corriendo, WHEN llega un `GET /locations`, THEN sigue respondiendo correctamente como antes (sin regresión).

2. GIVEN que el servidor HTTP está corriendo, WHEN llega un `POST /execute`, THEN se procesa con la nueva lógica de comandos.

3. GIVEN que el servidor HTTP está corriendo, WHEN llega cualquier otra ruta o método, THEN responde `404`.

4. GIVEN que `HomeViewModel` inicia el servidor, WHEN se llama a `locationServer.start()`, THEN tanto `/locations` como `/execute` quedan disponibles en el mismo servidor.
