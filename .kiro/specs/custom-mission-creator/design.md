# Diseño Técnico: Custom Mission Creator

## Visión General

Esta funcionalidad extiende EduLab para que los docentes puedan crear misiones de robótica personalizadas desde la biblioteca de misiones. Las misiones personalizadas se almacenan en PostgreSQL asociadas al `teacherId` del docente, se cargan automáticamente al iniciar sesión y se combinan con las misiones estáticas de `demoMissions` para formar una lista unificada. El flujo de asignación y resolución de misiones existente no cambia.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│  LibraryScreen (UI)                                             │
│  ┌──────────────────┐   ┌──────────────────────────────────┐   │
│  │  Botón "Crear"   │──▶│  CreateMissionModal (formulario) │   │
│  └──────────────────┘   └──────────────┬─────────────────┘    │
│                                         │ POST                  │
└─────────────────────────────────────────┼─────────────────────┘
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  AuthStore (auth-store-provider.tsx)                            │
│  state: missions = [...demoMissions, ...customMissions]         │
│  action: createMission(input) → POST → optimistic update        │
└─────────────────────────────────────────┬─────────────────────┘
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Routes (Next.js)                                           │
│  POST /api/teacher/create-mission  → insertMission()           │
│  GET  /api/teacher/data            → fetchCustomMissions()      │
└─────────────────────────────────────────┬─────────────────────┘
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  DB Store (db-store.ts)                                         │
│  fetchCustomMissions(teacherId)                                 │
│  insertMission(mission)                                         │
└─────────────────────────────────────────┬─────────────────────┘
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL — tabla missions                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de carga al iniciar sesión

```
loginWithPassword / restore session
        │
        ▼
loadTeacherData(uid, email)
        │
        ▼
GET /api/teacher/data?teacherId=uid
        │
        ▼
{ students, assignments, studentWorks, profile, missions }
        │
        ▼
setMissions([...demoMissions, ...data.missions])
```

### Flujo de creación de misión

```
Docente rellena formulario → valida → submit
        │
        ▼
createMission(input) en AuthStore
        │
        ├─▶ POST /api/teacher/create-mission
        │         │
        │         ▼
        │   insertMission(mission) en db-store
        │         │
        │         ▼
        │   INSERT INTO missions ...
        │
        └─▶ setMissions(prev => [...prev, newMission])  ← optimistic
```

## Componentes e Interfaces

### 1. `src/lib/types.ts` — Modificación del tipo `Mission`

Agregar campo opcional `teacherId`:

```typescript
export type Mission = {
  id: string;
  teacherId?: string;          // ← nuevo: presente solo en misiones personalizadas
  title: string;
  summary: string;
  category: MissionCategory;
  ageBand: MissionAgeBand;
  durationMinutes: number;
  outcomes: string[];
  status: "published" | "draft";
  coverTone: "blue" | "green" | "yellow" | "red" | "indigo" | "slate";
  steps?: MissionStep[];
  allowedCategories?: ("Movimiento" | "Hablar" | "Mostrar" | "Audio" | "Condición" | "Control")[];
};
```

Una misión es "personalizada" si y solo si `teacherId !== undefined`.

### 2. `src/lib/db-store.ts` — Nuevas funciones

```typescript
// Obtiene todas las misiones personalizadas de un docente
export async function fetchCustomMissions(teacherId: string): Promise<Mission[]>

// Inserta una nueva misión personalizada
export async function insertMission(mission: Mission): Promise<void>
```

Mapper interno:

```typescript
function rowToMission(row: Record<string, unknown>): Mission
```

### 3. `src/app/api/teacher/create-mission/route.ts` — Nuevo endpoint

```typescript
// POST /api/teacher/create-mission
// Body: Mission (con teacherId)
// Response: { ok: true, mission: Mission } | { ok: false, message: string }
export async function POST(req: NextRequest): Promise<NextResponse>
```

Validaciones en el servidor:
- `teacherId` presente y no vacío
- `title` no vacío
- `durationMinutes` > 0

### 4. `src/app/api/teacher/data/route.ts` — Modificación

Agregar `fetchCustomMissions(teacherId)` al `Promise.all` y retornar el campo `missions` en la respuesta.

### 5. `src/components/auth-store-provider.tsx` — Modificaciones

**Tipo `AuthStore`** — agregar:
```typescript
createMission: (input: CreateMissionInput) => Promise<{ ok: boolean; message?: string }>;
```

**Estado nuevo:**
```typescript
const [missions, setMissions] = useState<Mission[]>(demoMissions);
```

**`loadTeacherData`** — leer `data.missions` y combinar:
```typescript
setMissions([...demoMissions, ...(data.missions ?? [])]);
```

**`createMission`** — acción nueva:
```typescript
const createMission = useCallback(async (input: CreateMissionInput) => {
  if (!teacherId) return { ok: false, message: "No hay sesión activa." };
  const newMission: Mission = { ...input, id: createId("mission"), teacherId, status: "draft", createdAt: new Date().toISOString() };
  const res = await fetch("/api/teacher/create-mission", { method: "POST", ... });
  const data = await res.json();
  if (!data.ok) return { ok: false, message: data.message };
  setMissions(prev => [...prev, newMission]);
  return { ok: true };
}, [teacherId]);
```

**`value` del contexto** — reemplazar `missions: demoMissions` por `missions` (estado dinámico) y agregar `createMission`.

### 6. `src/components/create-mission-modal.tsx` — Nuevo componente

Formulario completo con:
- Campos básicos: título, resumen, categoría (select), rango de edad (select), duración (number)
- Sección outcomes: lista dinámica de inputs de texto con botones agregar/eliminar
- Sección steps: lista dinámica de filas (selector de tipo + input etiqueta + input helper) con botones agregar/eliminar
- Sección allowedCategories: 6 checkboxes
- Validación inline antes de submit
- Llamada a `createMission` del store

```typescript
type CreateMissionModalProps = {
  onClose: () => void;
};

export function CreateMissionModal({ onClose }: Readonly<CreateMissionModalProps>): JSX.Element
```

### 7. `src/components/library-screen.tsx` — Modificaciones

- Importar `CreateMissionModal`
- Agregar estado `showCreateModal: boolean`
- Agregar botón "Crear misión" junto al selector de edad (deshabilitado si `!teacherId`)
- Renderizar `<CreateMissionModal>` condicionalmente
- Agregar badge "Personalizada" en tarjetas donde `mission.teacherId !== undefined`

## Modelos de Datos

### Tabla `missions` (PostgreSQL)

```sql
CREATE TABLE IF NOT EXISTS missions (
  id                TEXT        PRIMARY KEY,
  teacher_id        TEXT        REFERENCES teachers(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  summary           TEXT        NOT NULL,
  category          TEXT        NOT NULL,
  age_band          TEXT        NOT NULL,
  duration_minutes  INTEGER     NOT NULL CHECK (duration_minutes > 0),
  outcomes          JSONB       NOT NULL DEFAULT '[]',
  steps             JSONB       NOT NULL DEFAULT '[]',
  allowed_categories JSONB      NOT NULL DEFAULT '[]',
  status            TEXT        NOT NULL DEFAULT 'draft',
  cover_tone        TEXT        NOT NULL DEFAULT 'blue',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missions_teacher_id ON missions(teacher_id);
```

`teacher_id` es nullable para permitir misiones globales en el futuro, pero en esta implementación siempre se inserta con el `teacherId` del docente.

### Tipo `CreateMissionInput`

```typescript
export type CreateMissionInput = {
  title: string;
  summary: string;
  category: MissionCategory;
  ageBand: MissionAgeBand;
  durationMinutes: number;
  outcomes: string[];
  steps: MissionStep[];
  allowedCategories: Mission["allowedCategories"];
  coverTone: Mission["coverTone"];
};
```

### Mapeo DB → TypeScript

| Columna DB           | Campo TypeScript     |
|----------------------|----------------------|
| `id`                 | `id`                 |
| `teacher_id`         | `teacherId`          |
| `title`              | `title`              |
| `summary`            | `summary`            |
| `category`           | `category`           |
| `age_band`           | `ageBand`            |
| `duration_minutes`   | `durationMinutes`    |
| `outcomes`           | `outcomes`           |
| `steps`              | `steps`              |
| `allowed_categories` | `allowedCategories`  |
| `status`             | `status`             |
| `cover_tone`         | `coverTone`          |
| `created_at`         | *(no expuesto)*      |

## Propiedades de Corrección

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre especificaciones legibles por humanos y garantías de corrección verificables por máquina.*

### Propiedad 1: Agregar outcomes incrementa la lista

*Para cualquier* número N de clics en "Agregar resultado", la lista de outcomes debe tener exactamente `inicial + N` entradas.

**Valida: Requisito 2.5**

---

### Propiedad 2: Agregar steps incrementa la lista

*Para cualquier* número N de clics en "Agregar paso", la lista de steps debe tener exactamente `inicial + N` entradas.

**Valida: Requisito 2.6**

---

### Propiedad 3: Eliminar outcome reduce la lista y excluye el elemento

*Para cualquier* lista de outcomes con longitud ≥ 2, eliminar el outcome en la posición i debe resultar en una lista de longitud `original - 1` que no contiene el elemento eliminado.

**Valida: Requisito 2.7**

---

### Propiedad 4: Eliminar step reduce la lista y excluye el elemento

*Para cualquier* lista de steps, eliminar el step en la posición i debe resultar en una lista de longitud `original - 1` que no contiene el elemento eliminado.

**Valida: Requisito 2.8**

---

### Propiedad 5: Validación rechaza títulos vacíos o solo espacios

*Para cualquier* cadena compuesta únicamente de caracteres de espacio en blanco (incluyendo la cadena vacía), intentar guardar con ese valor como título debe ser rechazado y el campo título debe mostrar un error.

**Valida: Requisito 3.1**

---

### Propiedad 6: Validación rechaza duraciones no positivas

*Para cualquier* valor de duración ≤ 0, intentar guardar debe ser rechazado y el campo duración debe mostrar un error.

**Valida: Requisito 3.3**

---

### Propiedad 7: Validación rechaza outcomes con entradas vacías

*Para cualquier* lista de outcomes que contenga al menos una entrada compuesta únicamente de espacios en blanco, intentar guardar debe ser rechazado.

**Valida: Requisito 3.4**

---

### Propiedad 8: Combinación de misiones preserva todas las entradas

*Para cualquier* array de misiones personalizadas retornado por la API, el estado `missions` del AuthStore debe ser igual a `[...demoMissions, ...customMissions]` — sin duplicados ni pérdidas.

**Valida: Requisitos 5.1, 7.3**

---

### Propiedad 9: Los filtros aplican uniformemente a misiones estáticas y personalizadas

*Para cualquier* combinación de filtros (categoría, rango de edad) y cualquier lista mixta de misiones, todas las misiones en el resultado filtrado deben satisfacer los criterios del filtro, independientemente de si tienen `teacherId` o no.

**Valida: Requisito 5.2**

---

### Propiedad 10: Badge "Personalizada" aparece exactamente en misiones con teacherId

*Para cualquier* misión con `teacherId !== undefined`, su tarjeta renderizada debe contener el badge "Personalizada". *Para cualquier* misión con `teacherId === undefined`, su tarjeta no debe contener ese badge.

**Valida: Requisito 5.3**

---

### Propiedad 11: fetchCustomMissions retorna solo misiones del docente solicitado

*Para cualquier* `teacherId`, `fetchCustomMissions(teacherId)` debe retornar únicamente misiones cuyo `teacher_id` en base de datos coincide exactamente con ese `teacherId`.

**Valida: Requisitos 5.4, 7.2**

---

### Propiedad 12: insertMission persiste todos los campos requeridos

*Para cualquier* objeto `Mission` válido, `insertMission(mission)` debe ejecutar una consulta SQL que incluya todos los campos requeridos: `id`, `teacher_id`, `title`, `summary`, `category`, `age_band`, `duration_minutes`, `outcomes`, `steps`, `allowed_categories`, `status`, `cover_tone`.

**Valida: Requisito 4.5**

---

### Propiedad 13: POST a create-mission incluye todos los campos y teacherId

*Para cualquier* datos de formulario de misión válidos, la petición POST enviada a `/api/teacher/create-mission` debe contener todos los campos de la misión más el `teacherId` de la sesión activa.

**Valida: Requisito 4.1**

---

### Propiedad 14: createMission añade la misión al estado en memoria

*Para cualquier* misión válida creada exitosamente, el array `missions` del AuthStore debe contener la nueva misión después de que `createMission` resuelva con `{ ok: true }`.

**Valida: Requisito 4.2**

## Manejo de Errores

| Escenario | Comportamiento |
|-----------|---------------|
| `teacherId` es `null` al crear | `createMission` retorna `{ ok: false, message: "No hay sesión activa." }` sin llamar a la API |
| Validación de formulario falla | Modal permanece abierto, errores inline visibles, no se hace fetch |
| POST a `/api/teacher/create-mission` falla (red o 5xx) | Modal permanece abierto, se muestra mensaje de error genérico, estado no cambia |
| `fetchCustomMissions` falla al cargar datos | Se usa `[]` como fallback, `demoMissions` siguen disponibles |
| `insertMission` lanza excepción en DB | El endpoint retorna `{ ok: false, message: "Error al guardar la misión." }` con status 500 |
| Título duplicado | No se valida unicidad — el docente puede tener misiones con el mismo título |

## Estrategia de Testing

### Tests unitarios (ejemplo-based)

- Renderizado de `LibraryScreen`: botón "Crear misión" presente en el panel de filtros
- Botón deshabilitado cuando `teacherId === null`
- Clic en botón abre `CreateMissionModal`
- Renderizado de `CreateMissionModal`: todos los campos presentes
- Submit exitoso cierra el modal
- Submit fallido mantiene el modal abierto con mensaje de error
- Asignar una Custom_Mission crea un assignment con el id correcto

### Tests de propiedades (property-based)

Se usará **fast-check** (TypeScript). Cada test se ejecuta con mínimo 100 iteraciones.

```
// Tag format: Feature: custom-mission-creator, Property N: <texto>
```

| Propiedad | Generadores | Verificación |
|-----------|-------------|--------------|
| P1: Agregar outcomes | `fc.integer({ min: 1, max: 20 })` para N clics | `outcomes.length === initial + N` |
| P2: Agregar steps | `fc.integer({ min: 1, max: 20 })` para N clics | `steps.length === initial + N` |
| P3: Eliminar outcome | `fc.array(fc.string(), { minLength: 2 })` + índice | longitud - 1, elemento ausente |
| P4: Eliminar step | `fc.array(stepArb, { minLength: 1 })` + índice | longitud - 1, elemento ausente |
| P5: Validación título vacío | `fc.stringMatching(/^\s*$/)` | submit rechazado, error en título |
| P6: Validación duración ≤ 0 | `fc.integer({ max: 0 })` | submit rechazado, error en duración |
| P7: Validación outcomes vacíos | array con al menos un `fc.stringMatching(/^\s*$/)` | submit rechazado |
| P8: Combinación de misiones | `fc.array(missionArb)` para custom missions | `missions === [...demoMissions, ...custom]` |
| P9: Filtros uniformes | `fc.record({ category, ageBand })` + `fc.array(missionArb)` | todos los resultados satisfacen filtro |
| P10: Badge "Personalizada" | `fc.option(fc.string())` para teacherId | badge presente ↔ teacherId definido |
| P11: fetchCustomMissions aislamiento | `fc.string()` para teacherId, array mixto en DB | solo retorna las del teacherId dado |
| P12: insertMission campos completos | `fc.record(missionArb)` | query contiene todos los campos |
| P13: POST body completo | `fc.record(createMissionInputArb)` | body contiene todos los campos + teacherId |
| P14: createMission actualiza estado | `fc.record(createMissionInputArb)` | missions incluye la nueva misión |

### Tests de integración

- `GET /api/teacher/data` retorna campo `missions` con las misiones del docente
- Estudiante accede a misión personalizada asignada y los datos se resuelven desde DB

### Notas de accesibilidad

- El botón "Crear misión" tiene `type="button"` y se deshabilita con `disabled` nativo
- El modal usa `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (patrón existente de `Modal`)
- Cada campo del formulario tiene `<label>` asociado con `htmlFor`
- Los mensajes de error se asocian con `aria-describedby` al campo correspondiente
- Los checkboxes de `allowedCategories` están dentro de un `<fieldset>` con `<legend>`
