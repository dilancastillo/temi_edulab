# FIX_MISSION_STEPS

## Problema

La pantalla de misión del estudiante tenía el título del panel lateral hardcodeado como "Ordena los pasos" y los pasos de guía eran fijos para todas las misiones (definidos en `orderStepsProgram`). Además, al tener pasos repetidos del mismo tipo de bloque, React lanzaba un warning por keys duplicadas.

## Cambios

### 1. Título dinámico en el panel lateral

**Archivo:** `src/components/student-mission-screen.tsx`

El `h2` del panel de instrucciones ahora muestra el título de la misión en vez del texto fijo.

```tsx
// Antes
<h2 id="mission-steps-title">Ordena los pasos</h2>

// Después
<h2 id="mission-steps-title">{mission.title}</h2>
```

### 2. Pasos de guía por misión

**Archivos:** `src/lib/types.ts`, `src/lib/mission-program.ts`, `src/components/student-mission-screen.tsx`, `src/lib/demo-data.ts`

Se agregó el campo opcional `steps` al tipo `Mission` y se actualizó `evaluateOrderSteps` para aceptar un programa personalizado. Cada misión puede definir su propia secuencia de bloques; si no lo hace, usa `orderStepsProgram` como fallback.

La misión `mission-order-steps` ("Taller Guía mi salón") ahora tiene 7 pasos propios:
`temi_start → temi_move → temi_say → temi_move → temi_say → temi_move → temi_say`

### 3. Fix de keys duplicadas en React

**Archivo:** `src/components/student-mission-screen.tsx`

El key del `.map()` de pasos pasó de `step.type` a `${step.type}-${index}` para evitar duplicados cuando una misión repite el mismo tipo de bloque.

```tsx
// Antes
key={step.type}

// Después
key={`${step.type}-${index}`}
```
