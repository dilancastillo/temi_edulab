# Tasks

## Task List

- [x] 1. Instalar dependencias y configurar servidor custom Next.js
  - [x] 1.1 Añadir `ws` y `@types/ws` a las dependencias del proyecto
  - [x] 1.2 Añadir `ts-node` y `tsx` a devDependencies para ejecutar `server.ts`
  - [x] 1.3 Crear `server.ts` en la raíz del proyecto con el servidor HTTP custom que adjunta el WebSocketServer al mismo puerto
  - [x] 1.4 Actualizar `package.json` scripts: `"start": "tsx server.ts"` y `"dev": "tsx server.ts"` (con `NODE_ENV=development`)
  - [x] 1.5 Crear `tsconfig.server.json` si es necesario para compilar `server.ts` con módulos CommonJS/ESM compatibles con Node.js

- [x] 2. Implementar Connection_Registry y ws-handler en el servidor
  - [x] 2.1 Crear `src/lib/ws-registry.ts` con `connectionRegistry: Map<string, WebSocket>` y `pendingRequests: Map<string, {...}>` como singletons del proceso
  - [x] 2.2 Crear `src/lib/ws-handler.ts` con la función `handleWsConnection(ws, req)` que:
    - Espera el primer mensaje como RegisterMessage
    - Si `robotId` vacío: cierra con código 4001
    - Si `robotId` ya registrado: cierra la conexión anterior y registra la nueva
    - Procesa mensajes entrantes: resuelve Promises pendientes por `requestId` para ResponseMessage y LocationsResponseMessage
    - Al cerrar: elimina del registry
  - [x] 2.3 Conectar `ws-handler.ts` al WebSocketServer en `server.ts`

- [x] 3. Implementar API routes del servidor proxy
  - [x] 3.1 Crear `src/app/api/robot/execute/route.ts` con `POST` handler:
    - Validar body `{ robotId, commands }` → 400 si falta alguno
    - Buscar conexión en registry → 404 si no existe
    - Generar `requestId`, crear Promise en `pendingRequests`, enviar `CommandMessage`
    - Await con timeout 300s → 504 si timeout
    - Retornar `{ ok, message }` con status 200
  - [x] 3.2 Crear `src/app/api/robot/locations/route.ts` con `GET` handler:
    - Validar query param `robotId` → 400 si falta
    - Buscar conexión en registry → fallback `{ locations: ["Sala Principal"] }` si no existe
    - Generar `requestId`, crear Promise, enviar `LocationsRequestMessage`
    - Await con timeout 5s → fallback si timeout o lista vacía
    - Retornar `{ locations }` con status 200
  - [x] 3.3 Crear `src/app/api/robot/status/route.ts` con `GET` handler:
    - Validar query param `robotId` → 400 si falta
    - Retornar `{ connected: connectionRegistry.has(robotId) }`

- [x] 4. Actualizar `src/lib/robot-adapter.ts`
  - [x] 4.1 Eliminar `getRobotApiUrl()`, `ROBOT_API_URL` y la lógica de IP
  - [x] 4.2 Añadir `getRobotId(): string` que lee `esbot.robotId.v1` de localStorage con fallback `"temi-1"`
  - [x] 4.3 Añadir `setRobotId(id: string): void` que persiste en localStorage bajo `esbot.robotId.v1`
  - [x] 4.4 Actualizar `executeRobotCommands(commands)` para hacer `POST /api/robot/execute` con body `{ robotId: getRobotId(), commands }`
  - [x] 4.5 Actualizar `fetchRobotLocations()` para hacer `GET /api/robot/locations?robotId={getRobotId()}`

- [x] 5. Implementar `RobotWebSocketClient.kt` en Android
  - [x] 5.1 Crear `apps/App_Edulab/app/src/main/java/com/esbot/edulab/core/robot/RobotWebSocketClient.kt` con:
    - OkHttp `WebSocket` client con `pingInterval(30s)`
    - `resolveRobotId()`: reflection a `Robot.getInstance().getSerialNumber()`, fallback `Build.SERIAL`, fallback `"temi-1"`
    - `connect()`: conectar a `ws://87.99.152.162/api/robot/ws`
    - `onOpen`: enviar `RegisterMessage { type: "register", robotId }`
    - `onMessage`: parsear JSON y despachar a `handleExecute()` o `handleLocations()`
    - `onClosed` / `onFailure`: llamar a `scheduleReconnect()`
    - `scheduleReconnect()`: `Handler(Looper.getMainLooper()).postDelayed({ connect() }, 5000)`
    - Flag `@Volatile executing: Boolean` para rechazar comandos concurrentes
  - [x] 5.2 Implementar `handleExecute(msg: CommandMessage)`:
    - Si `executing`: enviar `ResponseMessage { ok: false, message: "Robot ocupado" }`
    - Si no: ejecutar `commandRunner.runSequence(commands)` en un coroutine/thread
    - Enviar `ResponseMessage { ok: true/false, message, requestId }`
  - [x] 5.3 Implementar `handleLocations(msg: LocationsRequestMessage)`:
    - Obtener ubicaciones via reflection (`Robot.getInstance().getLocations()`)
    - Enviar `LocationsResponseMessage { type: "locations_response", requestId, locations }`
  - [x] 5.4 Añadir `okhttp3:mockwebserver` a `build.gradle.kts` para tests (solo `testImplementation`)

- [x] 6. Integrar `RobotWebSocketClient` en la app Android
  - [x] 6.1 Añadir `RobotWebSocketClient` al módulo Hilt en `RobotModule.kt` como `@Singleton`
  - [x] 6.2 Actualizar `HomeViewModel` para inyectar `RobotWebSocketClient` y llamar a `start()` en `init` y `stop()` en `onCleared()`
  - [x] 6.3 Mostrar el `robotId` resuelto en `HomeScreenContent` (texto pequeño en la TopBar o en el SideMenu) para que el docente pueda copiarlo
  - [x] 6.4 Mantener `TemiLocationServer` como fallback opcional o eliminarlo si ya no es necesario (decisión: eliminarlo para simplificar)

- [x] 7. Actualizar panel del docente (UI web)
  - [x] 7.1 Añadir campo de texto para `robotId` en el componente de configuración del docente (identificar el componente correcto en `src/components/`)
  - [x] 7.2 Al guardar, llamar a `setRobotId(id)` del robot-adapter
  - [x] 7.3 Mostrar indicador de estado de conexión consultando `GET /api/robot/status?robotId={id}` con polling cada 10s o al cargar

- [x] 8. Tests del servidor (Vitest + fast-check)
  - [x] 8.1 Crear `src/lib/__tests__/ws-registry.test.ts` con property tests para Properties 2, 3, 4, 5 usando mocks de WebSocket
    - **[PBT]** Property 2: Para cualquier `robotId` válido, el registry lo almacena tras RegisterMessage
    - **[PBT]** Property 3: Para cualquier `robotId`, el reregistro reemplaza la conexión anterior
    - **[PBT]** Property 4: Para cualquier `robotId`, el cierre limpia el registry
    - **[PBT]** Property 5: Para cualquier conjunto de `robotId` distintos, todos coexisten
  - [x] 8.2 Crear `src/lib/__tests__/robot-adapter.test.ts` con property tests para Properties 9, 10
    - **[PBT]** Property 9: Para cualquier `robotId` en localStorage, el adapter lo usa en las peticiones
    - **[PBT]** Property 10: `setRobotId` + `getRobotId` es un round-trip
  - [x] 8.3 Crear `src/app/api/robot/__tests__/execute.test.ts` con:
    - **[PBT]** Property 6: Para cualquier payload de comandos, el `requestId` correlaciona correctamente
    - Example: execute con `robotId` no registrado retorna 404
    - Example: execute sin body retorna 400
    - Example: timeout retorna 504
  - [x] 8.4 Crear `src/app/api/robot/__tests__/locations.test.ts` con:
    - **[PBT]** Property 7: Para cualquier petición de locations, el `requestId` correlaciona correctamente
    - Example: locations sin `robotId` retorna 400
    - Example: locations con `robotId` no registrado retorna fallback
  - [x] 8.5 Crear `src/app/api/robot/__tests__/status.test.ts` con:
    - **[PBT]** Property 8: Para cualquier `robotId`, el status refleja el estado del registry

- [ ] 9. Tests del Robot_Client Android (Kotest + kotest-property)
  - [ ] 9.1 Crear `RobotWebSocketClientTest.kt` con property tests para Properties 1, 11, 12
    - **[PBT]** Property 1: Para cualquier `robotId`, el RegisterMessage enviado lo contiene
    - **[PBT]** Property 11: Para cualquier lista de comandos, se ejecutan en orden y el `requestId` se preserva
    - **[PBT]** Property 12: Para cualquier `LocationsRequestMessage`, el `requestId` se preserva en la respuesta
  - [ ] 9.2 Añadir example tests:
    - Robot ocupado retorna ResponseMessage con `ok: false` y "Robot ocupado"
    - Error en ejecución retorna ResponseMessage con `ok: false`
    - Reconexión se programa tras cierre de conexión (verificar `scheduleReconnect` llamado)
