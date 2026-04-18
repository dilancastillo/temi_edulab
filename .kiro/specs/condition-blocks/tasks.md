# Plan de Implementación: condition-blocks

## Descripción general

Implementar el bloque Blockly `temi_condition` de extremo a extremo: definición visual en Next.js (TypeScript), extracción de comandos, integración con la misión `mission-order-steps`, y ejecución ASR en la app Android (Kotlin).

## Tareas

- [x] 1. Extender tipos base en Next.js
  - Agregar `"temi_condition"` a la unión `ProgramBlockType` en `src/lib/mission-program.ts`
  - Agregar los tipos `ConditionAction`, `ConditionOption` y `AskConditionCommand` en `src/lib/robot-adapter.ts`
  - Extender la unión `RobotExecuteCommand` para incluir `AskConditionCommand`
  - _Requirements: 8.2, 3.1_

- [x] 2. Agregar paso temi_condition a la misión y categoría al toolbox
  - [x] 2.1 Agregar paso `temi_condition` a `mission-order-steps.steps[]` en `src/lib/demo-data.ts`
    - Label: `"¡Pregunta al visitante!"`, helper: `"Haz que Temi pregunte y reaccione según la respuesta."`
    - Agregar `"Condición"` al array `allowedCategories` de la misión `mission-order-steps`
    - _Requirements: 8.1, 8.4_

  - [ ]* 2.2 Escribir test unitario para evaluateOrderSteps con temi_condition
    - Verificar que `evaluateOrderSteps` cuenta `temi_condition` como paso completado cuando está en la posición correcta
    - _Requirements: 8.2, 8.3_

- [x] 3. Implementar extracción del comando AskCondition en robot-adapter.ts
  - [x] 3.1 Implementar función auxiliar `buildConditionAction`
    - Manejar los tres tipos: `Navigate`, `Say`, `ShowImage`
    - Retornar `null` para tipos desconocidos
    - _Requirements: 3.4, 3.5, 3.6_

  - [ ]* 3.2 Escribir test de propiedad para buildConditionAction
    - **Property 4: buildConditionAction construye la acción correcta para cada tipo**
    - **Validates: Requirements 3.4, 3.5, 3.6**

  - [x] 3.3 Agregar rama `temi_condition` en la función `walk()` de `extractCommandsFromWorkspace`
    - Leer `QUESTION`, `OPTION_COUNT` y los campos `KEYWORD_i`, `ACTION_TYPE_i`, `ACTION_VALUE_i`
    - Omitir el bloque si `QUESTION` está vacío o hay menos de 2 opciones válidas
    - Respetar el orden de la cadena de bloques
    - _Requirements: 3.1, 3.2, 3.3, 3.7_

  - [ ]* 3.4 Escribir test de propiedad para extractCommandsFromWorkspace con temi_condition
    - **Property 3: Extracción produce AskConditionCommand válido**
    - **Validates: Requirements 3.1, 3.7**

  - [ ]* 3.5 Escribir tests unitarios para extractCommandsFromWorkspace
    - Caso: bloque con 2 opciones válidas → produce `AskConditionCommand` correcto
    - Caso: bloque con `QUESTION` vacío → omite el bloque
    - Caso: bloque con menos de 2 opciones válidas → omite el bloque
    - Caso: bloque en medio de una secuencia → posición correcta en la lista
    - _Requirements: 3.1, 3.2, 3.3, 3.7_

- [x] 4. Checkpoint — Verificar tipos y extracción
  - Asegurarse de que no hay errores de TypeScript en `mission-program.ts`, `robot-adapter.ts` y `demo-data.ts`. Preguntar al usuario si hay dudas.

- [x] 5. Definir bloque temi_condition en BlocklyWorkspace
  - [x] 5.1 Agregar la definición del bloque `temi_condition` dentro de `defineTemiBlocks` en `src/components/blockly-workspace.tsx`
    - Campo `QUESTION` (field_input)
    - Campo `OPTION_COUNT` (field_number, min 2, max 5, valor por defecto 2)
    - Por cada opción i (1..5): campos `KEYWORD_i`, `ACTION_TYPE_i` (dropdown: Navigate/Say/ShowImage), `ACTION_VALUE_i`
    - `previousStatement: null`, `nextStatement: null`, color `#c84b1f`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 5.2 Agregar categoría `"Condición"` al objeto `toolbox` en `blockly-workspace.tsx`
    - Color `#c84b1f`, contiene el bloque `temi_condition`
    - _Requirements: 1.1, 8.4_

  - [ ]* 5.3 Escribir test de propiedad para serialización del bloque
    - **Property 1: Campos dinámicos según OPTION_COUNT**
    - **Validates: Requirements 1.4, 2.3**

  - [ ]* 5.4 Escribir test de propiedad para serialización completa
    - **Property 2: Serialización completa del bloque temi_condition**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 6. Extender RobotCommandRunner en Android (Kotlin)
  - Agregar `data class AskCondition(val question: String, val options: List<ConditionOption>)` al sealed class `RobotCommand` en `RobotCommandRunner.kt`
  - Agregar `data class ConditionOption(val keyword: String, val action: RobotCommand)` en el mismo archivo
  - _Requirements: 5.1, 6.1_

- [x] 7. Implementar askConditionAndWait en RobotReflectionRunner (Kotlin)
  - [x] 7.1 Implementar la función privada `askConditionAndWait(question, options)`
    - Llamar a `speakAndWait(question)` y retornar el fallo si ocurre
    - Registrar `AsrListener` via reflection y llamar a `Robot.startDefaultNlu()`
    - Esperar hasta 15 segundos con `CountDownLatch`
    - Matching case-insensitive por `contains` sobre el texto ASR; primera coincidencia gana
    - Remover el listener siempre al finalizar (match, no-match o timeout)
    - Ejecutar la acción si hubo match; retornar `Result.success(Unit)` si no
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4_

  - [x] 7.2 Agregar rama `is RobotCommand.AskCondition` en el `when` de `run()` en `RobotReflectionRunner.kt`
    - _Requirements: 6.1_

  - [ ]* 7.3 Escribir test de propiedad para el algoritmo de matching
    - **Property 6: Matching case-insensitive por contains**
    - **Validates: Requirements 7.1, 7.4**

  - [ ]* 7.4 Escribir test de propiedad para primera coincidencia
    - **Property 7: Primera coincidencia gana en matching**
    - **Validates: Requirements 7.2**

  - [ ]* 7.5 Escribir test de propiedad para texto vacío
    - **Property 8: Texto vacío o solo espacios no produce match**
    - **Validates: Requirements 7.3**

  - [ ]* 7.6 Escribir test de propiedad para sin match o timeout
    - **Property 9: Sin match o timeout → secuencia continúa sin error**
    - **Validates: Requirements 6.5**

  - [ ]* 7.7 Escribir test de propiedad para remoción del listener
    - **Property 10: AsrListener siempre se remueve al finalizar**
    - **Validates: Requirements 6.6**

- [x] 8. Implementar parser AskCondition en TemiLocationServer (Kotlin)
  - [x] 8.1 Implementar la función privada `parseConditionOptions(context: String): List<ConditionOption>`
    - Extraer el array `"options"` del contexto JSON
    - Por cada keyword encontrado, extraer el tipo de acción y construir el `RobotCommand` correspondiente
    - Ignorar opciones con tipo de acción desconocido
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 8.2 Agregar rama `"AskCondition"` en el `when` de `parseCommandsFromJson` en `TemiLocationServer.kt`
    - Extraer `question` y llamar a `parseConditionOptions`
    - Agregar el comando solo si hay ≥2 opciones válidas
    - _Requirements: 5.1, 5.2_

  - [ ]* 8.3 Escribir test de propiedad para round-trip JSON ↔ parsing Android
    - **Property 5: Round-trip serialización JSON ↔ parsing Android**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.3, 5.4, 5.5**

- [x] 9. Checkpoint final — Asegurarse de que todos los tests pasan
  - Verificar que no hay errores de compilación en TypeScript ni en Kotlin. Preguntar al usuario si hay dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los tests de propiedad usan **fast-check** (TypeScript) para el lado Next.js
- El matching ASR es siempre case-insensitive y por `contains`; la primera coincidencia en el orden de la lista gana
- Las acciones anidadas en `ConditionOption` no pueden ser `AskCondition` (sin recursión)
