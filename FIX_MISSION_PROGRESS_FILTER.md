# Fix: Filtro de misión al ver progreso desde el dashboard

## Problema

Al hacer clic en "Ver progreso" de cualquier misión en el dashboard, siempre redirigía a `/profesor/estudiantes` sin ningún filtro aplicado, mostrando todos los estudiantes sin importar qué misión se había clickeado.

## Causa

El botón "Ver progreso" en `dashboard-screen.tsx` tenía un href estático:

```tsx
// Antes
<Link className="button button-secondary" href="/profesor/estudiantes">
  Ver progreso
</Link>
```

Y `StudentsScreen` inicializaba el filtro de misión siempre en `"all"`:

```ts
// Antes
const [missionId, setMissionId] = useState("all");
```

## Solución

### 1. Pasar el missionId por query param

```tsx
// dashboard-screen.tsx - Después
<Link className="button button-secondary" href={`/profesor/estudiantes?mision=${assignment.missionId}`}>
  Ver progreso
</Link>
```

### 2. Leer el query param al iniciar StudentsScreen

```ts
// students-screen.tsx - Después
const searchParams = useSearchParams();
const initialMissionId = searchParams.get("mision") ?? "all";
const [missionId, setMissionId] = useState(initialMissionId);
```

### 3. Agregar Suspense boundary requerido por Next.js

`useSearchParams` requiere un `Suspense` boundary en Next.js:

```tsx
// src/app/profesor/estudiantes/page.tsx - Después
import { Suspense } from "react";
import { StudentsScreen } from "@/components/students-screen";

export default function StudentsPage() {
  return (
    <Suspense>
      <StudentsScreen />
    </Suspense>
  );
}
```

## Archivos modificados

- `src/components/dashboard-screen.tsx`
- `src/components/students-screen.tsx`
- `src/app/profesor/estudiantes/page.tsx`

## Comportamiento esperado

1. Profesor ve la lista de misiones en curso en el dashboard
2. Hace clic en "Ver progreso" de una misión específica (ej: Fundamentos)
3. Redirige a `/profesor/estudiantes?mision=mission-foundations`
4. El filtro de Misión se aplica automáticamente mostrando solo los estudiantes de esa misión
