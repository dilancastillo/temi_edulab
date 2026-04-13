# Esbot EduLab API

Backend compartido para:

- capa profesor
- capa estudiante
- sincronizacion con Temi V3

## Setup

1. Copia el entorno:

```powershell
Copy-Item .env.example .env
```

2. Verifica `DATABASE_URL`.

3. Genera Prisma:

```powershell
npm.cmd run prisma:generate
```

4. Aplica migraciones:

```powershell
npm.cmd run prisma:migrate
```

5. Carga datos demo:

```powershell
npm.cmd run prisma:seed
```

6. Arranca el servidor:

```powershell
npm.cmd run dev
```

## Endpoints principales

Auth web:

- `POST /v1/auth/login`
- `POST /v1/auth/student-login`
- `POST /v1/auth/logout`
- `GET /v1/bootstrap`

Profesor:

- `POST /v1/students`
- `PATCH /v1/students/:studentId`
- `DELETE /v1/students/:studentId`
- `POST /v1/students/import`
- `POST /v1/assignments`
- `POST /v1/assignments/:assignmentId/archive`
- `DELETE /v1/assignments/:assignmentId`
- `PATCH /v1/profile`
- `GET /v1/robots`
- `GET /v1/class-sessions`
- `POST /v1/class-sessions`
- `POST /v1/class-sessions/:classSessionId/approve`

Estudiante:

- `POST /v1/student-work/save`
- `POST /v1/student-work/submit`

Robot:

- `POST /v1/robot/pairing-requests`
- `GET /v1/robot/pairing-requests/:pairingRequestId`
- `POST /v1/robot/locations/sync`
- `POST /v1/robot/heartbeat`
- `GET /v1/robot/sessions/next`
- `POST /v1/robot/events`

## Seed demo

El seed crea:

- 1 institucion
- 1 profesor
- 1 admin institucional
- 8 estudiantes
- 6 misiones
- 3 asignaciones
- 1 robot Temi ya registrado
- ubicaciones demo del mapa

## Pairing robot

Flujo previsto:

1. el robot crea `pairingRequest`
2. la web confirma la vinculacion con institucion y curso
3. la API emite token de robot
4. el robot consume ese token una sola vez
5. a partir de ahi sincroniza ubicaciones, heartbeat y sesiones
