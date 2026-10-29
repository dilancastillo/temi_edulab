# Plan de Implementación: Custom Mission Creator

## Tareas

- [x] 1. Crear tabla missions en PostgreSQL y actualizar tipos
  - [x] 1.1 Agregar campo `teacherId?: string` opcional al tipo `Mission` en `src/lib/types.ts`
  - [x] 1.2 Agregar tipo `CreateMissionInput` en `src/lib/types.ts`
  - [x] 1.3 Crear script SQL de migración con `CREATE TABLE IF NOT EXISTS missions (...)` e índice `idx_missions_teacher_id`
  - [x] 1.4 Ejecutar la migración contra la base de datos de desarrollo

- [x] 2. Agregar funciones de DB en db-store.ts
  - [x] 2.1 Implementar `fetchCustomMissions(teacherId: string): Promise<Mission[]>` con `SELECT * FROM missions WHERE teacher_id = $1`
  - [x] 2.2 Implementar `insertMission(mission: Mission): Promise<void>` con `INSERT INTO missions (...) VALUES (...)`
  - [x] 2.3 Implementar mapper privado `rowToMission(row)` que convierte snake_case a camelCase y parsea campos JSONB

- [ ] 3. Crear endpoint POST /api/teacher/create-mission
  - [x] 3.1 Crear archivo `src/app/api/teacher/create-mission/route.ts`
  - [x] 3.2 Implementar validación de servidor: `teacherId` presente, `title` no vacío, `durationMinutes > 0`
  - [x] 3.3 Llamar a `insertMission(mission)` y retornar `{ ok: true, mission }` o `{ ok: false, message }`

- [x] 4. Actualizar endpoint GET /api/teacher/data
  - [x] 4.1 Agregar `fetchCustomMissions(teacherId)` al `Promise.all` existente en `src/app/api/teacher/data/route.ts`
  - [x] 4.2 Incluir el campo `missions` en el objeto de respuesta JSON

- [x] 5. Actualizar AuthStore
  - [x] 5.1 Agregar estado `missions` con `useState<Mission[]>(demoMissions)` en `auth-store-provider.tsx`
  - [x] 5.2 Agregar tipo `CreateMissionInput` al import de `src/lib/types.ts`
  - [x] 5.3 Actualizar `loadTeacherData` para leer `data.missions` y llamar `setMissions([...demoMissions, ...(data.missions ?? [])])`
  - [x] 5.4 Implementar acción `createMission(input: CreateMissionInput)` que hace POST, actualiza estado optimistamente y retorna `{ ok, message? }`
  - [x] 5.5 Agregar `createMission` al tipo `AuthStore` en la sección de tipos
  - [x] 5.6 Reemplazar `missions: demoMissions` por `missions` (estado dinámico) en el objeto `value` del contexto
  - [x] 5.7 Agregar `createMission` y `missions` (estado) a las dependencias del `useMemo` del contexto

- [x] 6. Crear componente CreateMissionModal
  - [x] 6.1 Crear archivo `src/components/create-mission-modal.tsx` con estructura base usando el componente `Modal` existente
  - [x] 6.2 Implementar campos básicos: título (text), resumen (textarea), categoría (select con `MissionCategory`), rango de edad (select con `MissionAgeBand`), duración (number), tono de portada (select con `coverTone`)
  - [x] 6.3 Implementar sección de outcomes: lista dinámica con inputs de texto, botón "Agregar resultado" y botón eliminar por entrada (deshabilitado si solo queda una)
  - [x] 6.4 Implementar sección de steps: lista dinámica con selector de `ProgramBlockType`, input etiqueta, input helper y botón eliminar por fila
  - [x] 6.5 Implementar sección de allowedCategories: 6 checkboxes dentro de `<fieldset>` con `<legend>`
  - [x] 6.6 Implementar validación inline: título vacío/espacios, resumen vacío/espacios, duración ≤ 0, outcomes con entradas vacías, steps con etiqueta o helper vacíos
  - [x] 6.7 Implementar submit: llamar a `createMission` del store, cerrar modal si `ok: true`, mostrar error si `ok: false`
  - [x] 6.8 Asegurar accesibilidad: `htmlFor` en labels, `aria-describedby` en campos con error, `role="dialog"` heredado del Modal

- [x] 7. Actualizar LibraryScreen
  - [x] 7.1 Importar `CreateMissionModal` en `src/components/library-screen.tsx`
  - [x] 7.2 Agregar estado `showCreateModal: boolean` inicializado en `false`
  - [x] 7.3 Leer `teacherId` del store con `useDemoStore()`
  - [x] 7.4 Agregar botón "Crear misión" junto al selector de edad en el `filter-panel`, deshabilitado cuando `!teacherId`
  - [x] 7.5 Renderizar `<CreateMissionModal onClose={() => setShowCreateModal(false)} />` condicionalmente
  - [x] 7.6 Agregar badge "Personalizada" en las tarjetas de misión cuando `mission.teacherId !== undefined`


