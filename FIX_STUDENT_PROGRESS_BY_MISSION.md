# Fix: Progreso de estudiante por misión en el directorio

## Problema

En el directorio de estudiantes, al filtrar por una misión específica, la columna "Progreso" mostraba el progreso global del estudiante (`student.progress`), no el progreso real en esa misión. Esto causaba que Ana apareciera como "Revisar" en todas las misiones aunque solo había enviado una.

Además, el filtro de misión usaba `student.currentMissionId` (un solo campo), por lo que un estudiante con dos misiones asignadas solo aparecía en el filtro de una de ellas.

## Causa

### 1. Filtro de misión incorrecto
```ts
// Antes - solo filtraba por la misión actual del estudiante
const matchesMission = missionId === "all" || student.currentMissionId === missionId;
```

### 2. Progreso global en lugar de por misión
```tsx
// Antes - mostraba el progreso global
<span className={`status-pill status-${student.progress...}`}>
  {student.progress}
</span>
```

### 3. assignMission sobreescribía currentMissionId
```ts
// Antes - la segunda misión asignada borraba la primera
currentMissionId: input.missionId
```

## Solución

### 1. Filtro por asignaciones activas del curso
```ts
const courseIdsWithMission = missionId === "all"
  ? null
  : new Set(
      assignments
        .filter((a) => a.status === "active" && a.missionId === missionId)
        .map((a) => a.courseId)
    );

const matchesMission = courseIdsWithMission === null || courseIdsWithMission.has(student.courseId);
```

### 2. Progreso calculado por misión usando studentWorks
```ts
const missionAssignment = missionId !== "all"
  ? assignments.find((a) => a.missionId === missionId && a.courseId === student.courseId && a.status === "active")
  : null;
const studentWork = missionAssignment
  ? studentWorks.find((w) => w.studentId === student.id && w.assignmentId === missionAssignment.id)
  : null;
const missionProgress = studentWork?.status === "submitted"
  ? "Revisar"
  : missionId !== "all"
    ? "En curso"
    : student.progress;
```

### 3. assignMission no sobreescribe currentMissionId si ya existe
```ts
// Después - conserva la misión anterior
currentMissionId: student.currentMissionId ?? input.missionId
```

### 4. Datos demo limpiados
Se eliminaron `currentMissionId`, `demoAssignments` y `demoStudentWorks` pre-cargados para que el docente asigne misiones manualmente y el flujo funcione correctamente desde cero.

## Archivos modificados

- `src/components/students-screen.tsx`
- `src/components/demo-store-provider.tsx`
- `src/lib/demo-data.ts`

## Comportamiento esperado

1. Docente asigna dos misiones al mismo curso (ej: "Toma decisiones" y "Acciones y eventos")
2. Al presionar "Ver progreso" de "Toma decisiones" → aparecen todos los estudiantes del curso con su progreso real en esa misión
3. Al presionar "Ver progreso" de "Acciones y eventos" → aparecen todos los estudiantes con su progreso real en esa misión
4. Si Ana solo envió "Acciones y eventos", aparece "Revisar" en esa misión y "En curso" en "Toma decisiones"
