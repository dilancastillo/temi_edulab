# Requirements Document

## Introduction

La arquitectura actual intenta conectar el browser directamente al robot Temi en `http://IP_ROBOT:8765`. Esto falla en producción porque el servidor web (`87.99.152.162`) y el robot están en redes distintas (red del colegio), y el robot no es accesible desde internet.

Esta feature reemplaza completamente esa arquitectura por una de **conexión inversa WebSocket**: el robot Temi inicia una conexión WebSocket saliente al servidor, se registra con un `robotId` configurable, y el servidor mantiene un mapa de conexiones activas. El browser envía comandos al servidor vía HTTP REST, y el servidor los reenvía al robot por el WebSocket ya establecido.

Esta arquitectura elimina la necesidad de que el robot sea accesible desde internet, soporta múltiples robots de distintos colegios conectados simultáneamente, y simplifica la configuración del docente (un `robotId` en lugar de una IP).

## Glossary

- **WebSocket_Server**: El endpoint WebSocket del servidor Next.js en `ws://87.99.152.162/api/robot/ws` que acepta conexiones entrantes de robots.
- **Robot_Client**: El módulo Android en la app Temi que mantiene la conexión WebSocket saliente al servidor y ejecuta los comandos recibidos.
- **Connection_Registry**: El mapa en memoria del servidor que asocia cada `robotId` con su conexión WebSocket activa.
- **Robot_Adapter**: El módulo `src/lib/robot-adapter.ts` que usa `robotId` en lugar de IP para enviar comandos al robot a través del servidor.
- **Proxy_API**: Los endpoints HTTP REST del servidor Next.js (`POST /api/robot/execute` y `GET /api/robot/locations`) que reciben peticiones del browser y las reenvían al robot por WebSocket.
- **robotId**: Identificador único de un robot Temi, configurable como string en la app Android y en el panel del docente. Ejemplo: `"colegio-san-jose-1"`.
- **RobotExecuteCommand**: El tipo que representa un comando ejecutable por el robot (Navigate, Say, ShowImage, ShowVideo, AskCondition, Repeat, WhileCount, WhileTimer, WhileListen).
- **CommandMessage**: Mensaje JSON enviado por el servidor al robot por WebSocket con la forma `{ type: "execute", requestId: string, commands: RobotExecuteCommand[] }`.
- **ResponseMessage**: Mensaje JSON enviado por el robot al servidor por WebSocket con la forma `{ type: "response", requestId: string, ok: boolean, message: string }`.
- **RegisterMessage**: Mensaje JSON enviado por el robot al conectarse con la forma `{ type: "register", robotId: string }`.
- **LocationsRequestMessage**: Mensaje JSON enviado por el servidor al robot con la forma `{ type: "locations", requestId: string }`.
- **LocationsResponseMessage**: Mensaje JSON enviado por el robot al servidor con la forma `{ type: "locations_response", requestId: string, locations: string[] }`.

## Requirements

### Requirement 1: Conexión WebSocket del robot al servidor

**User Story:** Como robot Temi, quiero iniciar una conexión WebSocket saliente al servidor, para que el servidor pueda enviarme comandos aunque yo no sea accesible desde internet.

#### Acceptance Criteria

1. WHEN la app Android arranca, THE Robot_Client SHALL establecer una conexión WebSocket saliente a `ws://87.99.152.162/api/robot/ws`.
2. WHEN la conexión WebSocket se establece, THE Robot_Client SHALL enviar un RegisterMessage con el `robotId` configurado en la app.
3. WHILE la conexión WebSocket está activa, THE Robot_Client SHALL mantener la conexión abierta y procesar los mensajes entrantes del servidor.
4. IF la conexión WebSocket se cierra inesperadamente, THEN THE Robot_Client SHALL intentar reconectarse al servidor con un intervalo de 5 segundos entre intentos.
5. WHEN la app Android arranca, THE Robot_Client SHALL obtener el `robotId` automáticamente intentando primero `Robot.getInstance().getSerialNumber()` via reflection; si falla, usar `android.os.Build.SERIAL` como fallback.
6. THE Robot_Client SHALL mostrar el `robotId` resuelto en la interfaz de ajustes de la app para que el docente pueda copiarlo y configurarlo en el panel web.

### Requirement 2: Registro y gestión de conexiones en el servidor

**User Story:** Como servidor, quiero mantener un registro de todos los robots conectados, para poder enrutar comandos al robot correcto cuando el browser los solicite.

#### Acceptance Criteria

1. WHEN el servidor recibe una conexión WebSocket entrante, THE WebSocket_Server SHALL esperar un RegisterMessage del robot antes de registrar la conexión.
2. WHEN el servidor recibe un RegisterMessage válido con un `robotId`, THE WebSocket_Server SHALL almacenar la asociación `robotId → conexión WebSocket` en el Connection_Registry.
3. IF un robot con el mismo `robotId` ya está registrado, THEN THE WebSocket_Server SHALL reemplazar la conexión anterior con la nueva y cerrar la conexión anterior.
4. WHEN una conexión WebSocket se cierra, THE WebSocket_Server SHALL eliminar la entrada correspondiente del Connection_Registry.
5. THE Connection_Registry SHALL soportar múltiples robots con distintos `robotId` conectados simultáneamente.
6. IF el servidor recibe un RegisterMessage con un `robotId` vacío o ausente, THEN THE WebSocket_Server SHALL cerrar la conexión con código 4001.

### Requirement 3: Ejecución de comandos vía WebSocket

**User Story:** Como docente o estudiante, quiero enviar comandos al robot a través del servidor, para que la aplicación funcione aunque el browser y el robot estén en redes diferentes.

#### Acceptance Criteria

1. WHEN el browser envía `POST /api/robot/execute` con `{ robotId: string, commands: RobotExecuteCommand[] }`, THE Proxy_API SHALL buscar la conexión WebSocket del `robotId` en el Connection_Registry.
2. WHEN la conexión del robot está disponible, THE Proxy_API SHALL enviar un CommandMessage al robot por WebSocket y esperar el ResponseMessage correspondiente usando un `requestId` único.
3. WHEN el robot envía el ResponseMessage, THE Proxy_API SHALL retornar al browser `{ ok: boolean, message: string }` con status HTTP 200.
4. IF el `robotId` no está registrado en el Connection_Registry, THEN THE Proxy_API SHALL retornar `{ ok: false, message: "Robot no conectado" }` con status HTTP 404.
5. IF el robot no responde dentro de 300 segundos, THEN THE Proxy_API SHALL retornar `{ ok: false, message: "Robot no disponible o tiempo de espera agotado" }` con status HTTP 504.
6. IF el cuerpo de la petición no contiene `robotId` o `commands`, THEN THE Proxy_API SHALL retornar `{ ok: false, message: "Parámetros requeridos: robotId y commands" }` con status HTTP 400.

### Requirement 4: Obtención de ubicaciones vía WebSocket

**User Story:** Como docente o estudiante, quiero obtener las ubicaciones guardadas del robot a través del servidor, para que la lista de ubicaciones esté disponible aunque el browser no tenga acceso directo al robot.

#### Acceptance Criteria

1. WHEN el browser envía `GET /api/robot/locations?robotId={id}`, THE Proxy_API SHALL buscar la conexión WebSocket del `robotId` en el Connection_Registry.
2. WHEN la conexión del robot está disponible, THE Proxy_API SHALL enviar un LocationsRequestMessage al robot y esperar el LocationsResponseMessage correspondiente.
3. WHEN el robot responde con una lista de ubicaciones no vacía, THE Proxy_API SHALL retornar `{ locations: string[] }` con status HTTP 200.
4. IF el `robotId` no está registrado en el Connection_Registry, THEN THE Proxy_API SHALL retornar `{ locations: ["Sala Principal"] }` con status HTTP 200.
5. IF el robot no responde dentro de 5 segundos o responde con una lista vacía, THEN THE Proxy_API SHALL retornar `{ locations: ["Sala Principal"] }` con status HTTP 200.
6. IF el parámetro `robotId` no está presente en la query string, THEN THE Proxy_API SHALL retornar `{ ok: false, message: "Parámetro requerido: robotId" }` con status HTTP 400.

### Requirement 5: Ejecución de comandos en el robot

**User Story:** Como robot Temi, quiero recibir y ejecutar los comandos enviados por el servidor, para que el docente pueda controlarme desde la aplicación web.

#### Acceptance Criteria

1. WHEN el Robot_Client recibe un CommandMessage del servidor, THE Robot_Client SHALL ejecutar los comandos de la lista `commands` de forma secuencial.
2. WHEN todos los comandos se ejecutan correctamente, THE Robot_Client SHALL enviar un ResponseMessage con `{ type: "response", requestId, ok: true, message: "Ejecutado" }`.
3. IF ocurre un error durante la ejecución de un comando, THEN THE Robot_Client SHALL enviar un ResponseMessage con `{ type: "response", requestId, ok: false, message: <descripción del error> }`.
4. IF el Robot_Client ya está ejecutando una secuencia de comandos, THEN THE Robot_Client SHALL responder con `{ type: "response", requestId, ok: false, message: "Robot ocupado" }` sin ejecutar los nuevos comandos.
5. WHEN el Robot_Client recibe un LocationsRequestMessage, THE Robot_Client SHALL obtener las ubicaciones guardadas del SDK de Temi y enviar un LocationsResponseMessage con la lista.

### Requirement 6: Actualización del Robot_Adapter en el cliente

**User Story:** Como desarrollador, quiero que el Robot_Adapter del browser use `robotId` en lugar de IP para identificar al robot, para que la configuración sea más simple y funcione con múltiples robots.

#### Acceptance Criteria

1. THE Robot_Adapter SHALL enviar los comandos del robot a `POST /api/robot/execute` con `{ robotId: string, commands: RobotExecuteCommand[] }` en el body.
2. THE Robot_Adapter SHALL obtener las ubicaciones del robot desde `GET /api/robot/locations?robotId={id}`.
3. WHEN `executeRobotCommands` es invocada, THE Robot_Adapter SHALL leer el `robotId` desde `localStorage` (clave `esbot.robotId.v1`) o usar el valor por defecto `"temi-1"` si no está configurado.
4. WHEN `fetchRobotLocations` es invocada, THE Robot_Adapter SHALL leer el `robotId` desde `localStorage` (clave `esbot.robotId.v1`) o usar el valor por defecto `"temi-1"` si no está configurado.
5. THE Robot_Adapter SHALL exponer una función `setRobotId(id: string)` que persista el `robotId` en `localStorage` bajo la clave `esbot.robotId.v1`.

### Requirement 7: Configuración del robotId en el panel del docente

**User Story:** Como docente, quiero configurar el `robotId` del robot en el panel de la aplicación, para poder conectarme al robot de mi colegio sin necesidad de conocer su IP.

#### Acceptance Criteria

1. THE Panel_Docente SHALL mostrar un campo de texto para que el docente introduzca el `robotId` del robot de su colegio.
2. WHEN el docente guarda el `robotId`, THE Panel_Docente SHALL persistir el valor en `localStorage` usando `setRobotId`.
3. THE Panel_Docente SHALL mostrar el estado de conexión del robot identificado por el `robotId` configurado, consultando `GET /api/robot/status?robotId={id}`.
4. WHEN el docente consulta el estado, THE Proxy_API SHALL retornar `{ connected: boolean }` indicando si el robot con ese `robotId` tiene una conexión WebSocket activa en el Connection_Registry.
