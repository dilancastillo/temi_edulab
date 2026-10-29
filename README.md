# Esbot EduLab

Plataforma educativa para enseñar programación y robótica con el robot **Temi**. Los estudiantes arman programas con bloques (Blockly) en la web y el docente los ejecuta en un robot real, que se desplaza por el aula, habla, escucha, muestra imágenes y reproduce videos.

El repositorio contiene:

| Carpeta | Qué es |
|---|---|
| raíz (`src/`, `server.ts`) | Plataforma web (Next.js) para docentes y estudiantes, más el servidor WebSocket que habla con los robots. |
| `apps/App_Edulab` | **App Android que corre en el robot Temi** (Kotlin + Compose + Hilt). Es la que está en uso. |
| `apps/robot-temi` | Prototipo anterior de app de robot con misiones locales y modo seguro. **No se usa**; no se comunica con la web. |

---

## Arquitectura

```
Navegador (docente / estudiante)          Robot Temi (app App_Edulab)
        │ https://edulab.esbot.co                 │ wss://edulab.esbot.co/api/robot/ws
        ▼                                         ▼
                 Proxy (443, SSL, reenvía WebSocket)
                              │ http://localhost:3000
                              ▼
        server.ts  →  Next.js (páginas + /api/*)  +  WebSocket /api/robot/ws
                              │
                              ▼
                PostgreSQL local (temi_edulab)        public/uploads (imágenes y videos)
```

- **Web:** Next.js 16 + React 19 + TypeScript. Sin librería de UI.
- **Base de datos:** PostgreSQL accedido con `pg` (`src/lib/db.ts`, `src/lib/db-store.ts`). En producción es un Postgres **local del servidor**, no Supabase.
- **Supabase:** solo queda el cliente `supabase-js` (`src/lib/supabase.ts`), usado por el login con Google, que está desactivado. Las variables `NEXT_PUBLIC_SUPABASE_*` siguen siendo necesarias porque el cliente se crea al cargar la app.
- **Archivos subidos:** se guardan en disco en `public/uploads/images` y `public/uploads/videos` y se sirven por `src/app/uploads/[...path]/route.ts`.

### Flujo principal

1. El robot abre la app EduLab, espera a que el SDK de Temi esté listo (`onRobotReady`) y se conecta por WebSocket registrándose con su número de serie como `robotId`.
2. El docente escribe ese `robotId` en **Configuración** (se guarda en `teachers.robot_id` y se entrega a sus estudiantes).
3. El docente registra estudiantes, crea o elige misiones y las asigna a un curso (cada asignación genera un código de misión).
4. El estudiante entra (correo + contraseña, o código de misión + nombre), arma el programa en Blockly, lo guarda y lo envía cuando cumple los pasos de la misión.
5. El docente ve la entrega en **Estudiantes** y pulsa **Ejecutar**: la web convierte los bloques en comandos y el servidor se los envía al robot.
6. El robot ejecuta los comandos uno tras otro y responde si salió bien o mal.

### Protocolo web ↔ robot

Todas las peticiones llevan un `requestId` y el servidor espera la respuesta en `pendingRequests` (`src/lib/ws-registry.ts`).

| Web | Servidor → robot | Robot → servidor | Espera |
|---|---|---|---|
| `POST /api/robot/execute` | `{type:"execute", requestId, commands}` | `{type:"response", requestId, ok, message}` | 5 min |
| `POST /api/robot/cancel` | `{type:"cancel", requestId}` | `{type:"response", ...}` | 5 min |
| `GET /api/robot/locations` | `{type:"locations", requestId}` | `{type:"locations_response", requestId, locations}` | 5 s (si falla: `["Sala Principal"]`) |
| `GET /api/robot/status` | (no habla con el robot; revisa `connectionRegistry`) | | |

Al conectarse, el robot envía `{type:"register", robotId}`. Si llega otra conexión con el mismo `robotId`, la anterior se cierra.

### Bloques y comandos

`src/lib/robot-adapter.ts` (`extractCommandsFromWorkspace`) convierte los bloques en comandos. En el robot los interpreta `RobotWebSocketClient` y los ejecuta `RobotReflectionRunner` (SDK de Temi por reflexión).

| Bloque | Comando | En el robot |
|---|---|---|
| `temi_move` | `Navigate {location}` | `goTo` y espera `complete` |
| `temi_say` | `Say {text, gender, speed, pitch, language, showAnimation}` | `setTtsVoice` + `speak`, espera `COMPLETED` |
| `temi_show_image` | `ShowImage {imageUrl}` | descarga y muestra 7 s a pantalla completa |
| `temi_show_video` | `ShowVideo {videoUrl}` | ExoPlayer a pantalla completa hasta terminar |
| `temi_ask` | `AskCapture {question}` | `askQuestion` y guarda la respuesta |
| `temi_condition` | `AskCondition {question, options[]}` | `askQuestion`, compara la respuesta y ejecuta la opción |
| `temi_repeat`, `temi_while_count` | (se expanden en la web) | comandos repetidos |
| `temi_while_timer` | `WhileTimer {seconds, commands}` | repite hasta cumplir el tiempo |
| `temi_while_listen` | `WhileListen {stopWord, maxIterations, commands}` | repite hasta escuchar la palabra |
| `temi_while_mqtt` | `WhileMqtt {topic, commands}` | repite hasta recibir un mensaje MQTT |
| `temi_wait` | `Wait {seconds}` | pausa |
| `temi_audio` | — | **no genera comando** (ver pendientes) |

---

## Desarrollo local

```powershell
npm.cmd install
npm.cmd run dev
```

Abre `http://localhost:3000`. Requiere un PostgreSQL accesible en `DATABASE_URL` con las tablas del proyecto.

> **Nota:** `npm run dev` fija `NODE_ENV=development`, y en ese modo `src/app/providers.tsx` usa `DemoStoreProvider`, mientras que las pantallas leen el store de `AuthStoreProvider`. Revisar antes de depender del modo dev (ver pendientes).

### Variables de entorno (`.env.local`)

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. **Obligatoria.** |
| `DATABASE_SSL` | `true` si la base requiere SSL. |
| `JWT_SECRET` | Firma de la sesión del docente. **Obligatoria**: sin ella el servidor no arranca. Generar con `node -p "require('crypto').randomBytes(32).toString('hex')"`. |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Correo de aviso cuando se registra un docente. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase (solo login Google, desactivado). |
| `SUPABASE_SERVICE_ROLE_KEY` | No se usa actualmente. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Login con Google (desactivado). |
| `NEXT_PUBLIC_ROBOT_API_URL` | IP del robot para la conexión HTTP antigua (en desuso). |
| `PORT` | Puerto del servidor, por defecto `3000`. |

### Verificación

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

---

## App del robot (`apps/App_Edulab`)

- Se abre con Android Studio. SDK de Temi `com.robotemi:sdk:1.137.1`, `minSdk 24`, `targetSdk 36`.
- Se registra en el robot como habilidad (`com.robotemi.sdk.metadata.SKILL`).
- Servidor: `wss://edulab.esbot.co/api/robot/ws` y base `https://edulab.esbot.co` (constantes en `RobotWebSocketClient.kt`).
- Credenciales MQTT en `apps/App_Edulab/local.properties` (no se sube a git):
  ```properties
  mqtt.brokerUri=ssl://...:8883
  mqtt.username=...
  mqtt.password=...
  ```
- Pantalla: animación de espera, barra superior con hora, idioma, robot ID, batería y conexión a internet; imágenes y videos a pantalla completa.
- Documentación del SDK: https://github.com/robotemi/sdk/wiki

---

## Producción

- Servidor **Hetzner** (pedir acceso SSH al equipo). App en `/opt/temi_edulab`, rama **`produ/jeisson`**.
- Proceso gestionado con **PM2** como `temi-web` (`tsx server.ts`, `NODE_ENV=production`, puerto 3000). PM2 arranca solo al reiniciar el servidor (`pm2-root` habilitado).
- Delante hay un **proxy** que sirve `https://edulab.esbot.co` y reenvía el WebSocket `/api/robot/ws` al puerto 3000.
- Base de datos: PostgreSQL local, base `temi_edulab`.

Actualizar producción (pasos habituales; confirmar con el equipo antes de usarlos):

```bash
cd /opt/temi_edulab
git pull origin produ/jeisson
npm install
npm run build
pm2 restart temi-web
```

> El workflow `.github/workflows/test-jeisson_temi-edulab-prod.yml` despliega `test/jeisson` a Azure; **no es el despliegue real**.

### Crear un docente

No hay pantalla de registro. Se crea llamando al endpoint (por ejemplo con Postman o `curl` desde el servidor):

```bash
curl -s -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"docente@colegio.edu.co","password":"ClaveSegura2026","fullName":"Nombre del Docente","institutionId":"inst-esbot"}'
```

La contraseña debe tener al menos 8 caracteres. Los cursos y la institución (`inst-esbot`) están definidos en `src/lib/demo-data.ts`.

---

## Mejoras pendientes

Revisión completa de código hecha en octubre de 2026 sobre el commit `dde489f`.

### 1. Seguridad (prioridad alta)
- [ ] `POST /api/auth/register` es público: cualquiera puede crear una cuenta de docente. Protegerlo con una clave de administrador en un encabezado (Postman la enviaría) o bloquear la ruta en el proxy.
- [ ] Endpoints que no verifican la sesión del docente: `teacher/update-profile`, `teacher/upsert-assignment`, `teacher/update-robot-id`, `teacher/update-mission`, `teacher/create-mission`, `teacher/delete-free-play`, `student/create`, `student/save-work`, `student/update-progress`, `image/upload`, `video/upload` y todos los `/api/robot/*`. Varios aceptan `teacherId` en el cuerpo.
- [ ] `GET /api/student/data?teacherId=…&studentId=…` devuelve datos de cualquier estudiante sin autenticación.
- [ ] El estudiante no tiene sesión en el servidor (solo `localStorage`). Darle una cookie firmada como al docente.
- [ ] El registro de docente envía la contraseña en texto plano por correo.
- [ ] El login por código de misión solo pide código y nombre completo.
- [ ] Borrar `/opt/temi_edulab/.env.local.save` en el servidor si no se usa.

### 2. Respaldos (prioridad alta)
- [ ] No hay respaldo confirmado de la base `temi_edulab` ni de `public/uploads`. Configurar `pg_dump` diario y copia de `public/uploads`, guardados fuera del servidor.
- [ ] Mover `public/uploads` fuera de la carpeta del repositorio (o agregarlo al `.gitignore`) para no perderlo con un `git clean` o un nuevo clon.
- [ ] Guardar el esquema completo de la base en el repo (hoy solo está la migración de `missions`).

### 3. Errores del robot (`RobotReflectionRunner.kt`)
- [ ] Trata el estado `reposing` de `goTo` como error y corta todo el programa. Según el SDK es un estado transitorio.
- [ ] El límite de 60 s para llegar a una ubicación hace fallar recorridos largos mientras el robot sigue caminando. Usar el `abort` del SDK (`descriptionId` 1004 = timeout).
- [ ] Pausar/cancelar solo se revisa entre comandos. Llamar `stopMovement()` y `cancelAllTtsRequests()` para detener de inmediato.
- [ ] `setTtsVoice` requiere el permiso SETTINGS de Temi, que nunca se verifica ni se pide; además cambia la voz de todo el robot.
- [ ] `askQuestion(String)` escucha en el idioma del sistema; usar `askQuestion(TtsRequest, SttRequest)` con español.
- [ ] El listener de navegación no filtra por la ubicación pedida.
- [ ] El robot ID que muestra la pantalla se calcula antes de que el SDK esté listo (puede mostrar `unknown`) y no se actualiza.
- [ ] La insignia "Conectado" indica internet, no la conexión con el servidor.
- [ ] Llamar `robot.onStart(activityInfo)` en `onRobotReady` para aparecer en la barra superior de Temi.
- [ ] Quitar `com.robotemi.permission.navigation` (no existe) y los `<uses-permission com.robotemi.*>` del manifest.

### 4. Errores de la web
- [ ] `npm run dev` probablemente falla: en modo desarrollo se monta `DemoStoreProvider`, pero las pantallas usan `useAuthStore`.
- [ ] El robot ID se revierte: al editar el perfil, `update-profile` reescribe `robot_id` con el valor viejo cargado en memoria.
- [ ] El docente lee el robot ID de `localStorage`, no de su perfil; en otro navegador aparece `temi-1`.
- [ ] El bloque **reproducir audio** no genera comando y el robot no hace nada.
- [ ] "Calificado" y "completados" se muestran pero nada los actualiza: falta la acción de calificar.
- [ ] Nombres de campos cruzados: `temi_while_timer` usa `SECONDS` para minutos y `temi_wait` usa `MINUTES` para segundos.

### 5. Funciones nuevas
- [ ] Vista del código en **Kotlin** en vivo al arrastrar bloques (pestaña Java de solo lectura), y después edición del código que actualice los bloques, activable por misión según la edad.
- [ ] Actualizar el SDK a 1.138 para usar la voz en español de Colombia (`ES_CO`) y pausas con `<break>`.
- [ ] Bloques nuevos con el SDK: girar (`turnBy`), mover la cabeza (`tiltAngle`), seguir a una persona (`beWithMe`), patrullar (`patrol`), detectar personas y elegir la velocidad del recorrido.
- [ ] Mostrar en el robot si está registrado en el servidor.
- [ ] Revisar la rama `mblock/test` (control del robot desde mBlock) antes de decidir el camino del editor de código.

### 6. Limpieza
- [ ] Código sin uso: `src/lib/supabase-store.ts`, `src/lib/video-store.ts` y `/api/video/[id]`, `image-upload-panel.tsx`, `video-upload-panel.tsx`, `blockly-image-field.ts`, el campo de IP del robot y, en la app, `TemiLocationServer` (HTTP en el puerto 8765).
- [ ] Decidir si se elimina `apps/robot-temi` o se documenta como prototipo.
- [ ] Decidir si se elimina o actualiza el workflow de Azure.
- [ ] Reiniciar el servidor de Hetzner en horario sin clases (tiene un reinicio de sistema pendiente).
