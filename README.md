# Esbot EduLab

Monorepo de Esbot EduLab con tres piezas:

- web Next.js para profesor y estudiante
- API Fastify + Prisma + PostgreSQL para auth, sesiones, misiones, robots y sincronizacion
- app Android nativa para Temi V3 en `apps/robot-temi`

## Arquitectura

La web ya no depende de `localStorage` como fuente principal. Ahora trabaja asi:

1. la web habla con rutas internas de Next (`/api/...`)
2. esas rutas guardan la sesion web en cookie `HttpOnly`
3. Next reenvia las solicitudes al backend en `apps/api`
4. el backend persiste en PostgreSQL con Prisma
5. el robot se integrara contra ese mismo backend por polling y token de dispositivo

## Stack

- Next.js 16.2.3 + React 19 + TypeScript
- Fastify + Prisma + PostgreSQL
- Kotlin + Jetpack Compose + Room + Temi SDK
- Vitest + Testing Library
- Docker Compose para PostgreSQL y Redis local

## Estructura

- raiz: app web Next.js
- `apps/api`: backend compartido web-robot
- `apps/robot-temi`: app Android para Temi V3

## Arranque rapido

1. Instala dependencias:

```powershell
npm.cmd install
```

2. Levanta base de datos y Redis:

```powershell
npm.cmd run db:up
```

3. Crea tu archivo de entorno para la web:

```powershell
Copy-Item .env.example .env.local
```

4. Crea tu archivo de entorno para la API:

```powershell
Copy-Item apps\api\.env.example apps\api\.env
```

5. Genera Prisma y aplica la migracion inicial:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
```

6. En una terminal corre la API:

```powershell
npm.cmd run dev:api
```

7. En otra terminal corre la web:

```powershell
npm.cmd run dev:web
```

8. Abre `http://localhost:3000`.

## Credenciales demo

Profesor:

- `profesor@esbot.test`
- `demo2026`

Administrador institucion:

- `admin@esbot.test`
- `admin2026`

Estudiante:

- `ana.garcia@esbot.test`
- `estudiante2026`

Codigo de mision demo:

- `SGKRBY`

## Lo que ya quedo conectado

- login web por backend con cookie segura
- bootstrap de profesor y estudiante desde PostgreSQL
- CRUD de estudiantes
- importacion CSV
- biblioteca y asignacion de misiones
- misiones en curso y archivado
- perfil docente
- guardado y envio de entregas de estudiante
- dashboard profesor con estado de robot y sesiones de clase
- endpoints backend para pairing, heartbeat, sync de ubicaciones, polling de sesiones y eventos de robot

## Lo que sigue en la integracion robot

El backend ya quedo listo para que la app de Temi consuma:

- `POST /v1/robot/pairing-requests`
- `GET /v1/robot/pairing-requests/:pairingRequestId`
- `POST /v1/robot/locations/sync`
- `POST /v1/robot/heartbeat`
- `GET /v1/robot/sessions/next`
- `POST /v1/robot/events`

Falta la siguiente fase: reemplazar en `apps/robot-temi` el runtime/mock local por llamadas reales a esos endpoints.

## Verificacion

Web:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

API:

```powershell
npm.cmd run typecheck:api
npm.cmd run build:api
```

## Seguridad

- sesion web en cookie `HttpOnly`
- tokens opacos para web y robot
- hash de token en base de datos
- rate limiting en la API
- validacion de entrada con Zod
- control por institucion
- `next` actualizado a `16.2.3` para corregir la vulnerabilidad alta reportada por `npm audit`

## Notas

- Google y Microsoft quedan listos en UI, pero la integracion OAuth real aun necesita credenciales del proyecto.
- La PWA sigue desactivada por ahora.
- Redis ya queda en `docker-compose.yml`, pero en esta fase todavia no se usa para colas productivas.
- La migracion inicial ya vive en `apps/api/prisma/migrations/20260411_initial/migration.sql`.
