# Acceso en red local y persistencia con Supabase

## 1. Acceso desde otros PCs en red local

### Problema

El servidor Next.js solo era accesible desde `192.168.10.54:3000`. Cualquier otro PC en una red diferente no podía conectarse, incluso si el servidor estaba escuchando correctamente.

### Causa raíz

`next.config.ts` tenía una lista blanca de orígenes permitidos con una sola IP hardcodeada:

```ts
allowedDevOrigins: ["192.168.10.54"]
```

Next.js en modo desarrollo bloquea las conexiones de orígenes no listados en `allowedDevOrigins`. Al cambiar de red, la IP del servidor cambia y los otros PCs quedan bloqueados.

### Cambios realizados

**`next.config.ts`**

```ts
// Antes
allowedDevOrigins: ["192.168.10.54"]

// Después
allowedDevOrigins: ["*"]
```

**`package.json`**

```json
// Antes
"start": "next start"

// Después
"start": "next start -H 0.0.0.0"
```

El script `dev` ya tenía `-H 0.0.0.0`, pero `start` (producción) escuchaba solo en `localhost`.

### Resultado

- Cualquier PC en la misma red WiFi puede acceder usando la IP actual del servidor.
- No es necesario editar `next.config.ts` al cambiar de red.
- Tanto modo desarrollo (`npm run dev`) como producción (`npm start`) escuchan en todas las interfaces.

### Nota

`allowedDevOrigins: ["*"]` solo aplica en modo desarrollo. En producción esta configuración no tiene efecto.

### Cómo encontrar tu IP actual

```bash
# Windows
ipconfig
# Buscar "Dirección IPv4" en el adaptador WiFi activo
```

Los otros PCs acceden con: `http://<tu-ip>:3000`

---

## 2. Persistencia de datos con Supabase

### Arquitectura

Los datos se sincronizan en tiempo real con Supabase. Cualquier PC que abra la app verá los mismos estudiantes, misiones y trabajos. La sesión de usuario se mantiene en `localStorage` (local por diseño — cada navegador tiene su propia sesión).

```
PC A ──┐
PC B ──┼──► Next.js server ──► Supabase (nube)
PC C ──┘
```

### Configuración

Las credenciales de Supabase se definen en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

El cliente se inicializa en `src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Tablas en Supabase

| Tabla | Descripción |
|---|---|
| `students` | Estudiantes registrados |
| `assignments` | Misiones asignadas a cursos |
| `student_works` | Trabajos y progreso de cada estudiante |
| `teacher_profiles` | Perfil del docente |

### Operaciones disponibles (`src/lib/supabase-store.ts`)

Cada tabla tiene tres operaciones básicas:

```ts
// Estudiantes
fetchStudents()           // Carga todos los estudiantes
upsertStudent(student)    // Crea o actualiza un estudiante
deleteStudentById(id)     // Elimina un estudiante

// Misiones asignadas
fetchAssignments()
upsertAssignment(assignment)
deleteAssignmentById(id)

// Trabajos de estudiantes
fetchStudentWorks()
upsertStudentWork(work)

// Perfil del docente
fetchProfile(id)
upsertProfile(profile)
```

### Estrategia de carga (fallback a datos demo)

Al iniciar la app, `DemoStoreProvider` carga datos desde Supabase en paralelo. Si Supabase no tiene datos aún, usa los datos demo locales como fallback:

```ts
setStudents(remoteStudents.length > 0 ? remoteStudents : demoStudents);
setAssignments(remoteAssignments.length > 0 ? remoteAssignments : demoAssignments);
setStudentWorks(remoteWorks.length > 0 ? remoteWorks : demoStudentWorks);
setProfile(remoteProfile ?? demoTeacherProfile);
```

### Sincronización en tiempo real

Cada acción que modifica datos (agregar estudiante, asignar misión, guardar trabajo) llama a Supabase directamente con `void upsertX(...)` — sin esperar la respuesta para no bloquear la UI. El estado local se actualiza de inmediato (optimistic update).

### Mapeo de columnas

Supabase usa `snake_case` y el código TypeScript usa `camelCase`. Cada tabla tiene dos funciones de mapeo:

```ts
rowToStudent(row)   // DB → TypeScript
studentToRow(s)     // TypeScript → DB
```

### Credenciales demo

| Rol | Email | Contraseña |
|---|---|---|
| Profesor | `profesor@esbot.test` | `demo2026` |
| Estudiante | correo del estudiante | `estudiante2026` |

La sesión se guarda en `localStorage` bajo la clave `esbot.session.v1`.
