# Documento de Requisitos: condition-blocks

## Introducción

Este documento describe los requisitos funcionales para el bloque `temi_condition` en la misión "Taller Guía mi salón" de EduLab. El bloque permite al robot Temi hacer una pregunta en voz alta, escuchar la respuesta del estudiante o visitante mediante reconocimiento de voz (ASR), y ejecutar una acción diferente según la opción reconocida. Los requisitos se derivan del diseño técnico aprobado.

---

## Glosario

- **Blockly_Workspace**: Editor visual de bloques basado en Blockly que el estudiante usa para programar a Temi.
- **temi_condition**: Bloque Blockly que representa una pregunta condicional con N opciones de respuesta.
- **ConditionBlock**: Representación interna del bloque `temi_condition` en el workspace serializado de Blockly.
- **AskConditionCommand**: Comando JSON enviado al robot Android que encapsula la pregunta y sus opciones.
- **ConditionOption**: Par `{ keyword, action }` que define una rama de respuesta dentro de un `AskConditionCommand`.
- **ConditionAction**: Acción ejecutable por el robot al reconocer un keyword; puede ser `Navigate`, `Say` o `ShowImage`.
- **Extractor**: Función `extractCommandsFromWorkspace` en `robot-adapter.ts` que convierte el workspace serializado en una lista de `RobotExecuteCommand`.
- **ASR_Listener**: Componente Android (`AsrListener.onAsrResult`) que recibe el texto reconocido por el micrófono de Temi.
- **RobotCommandRunner**: Clase Android que ejecuta la secuencia de comandos recibida del servidor HTTP.
- **TemiLocationServer**: Servidor HTTP embebido en la app Android que recibe el JSON de comandos vía `POST /execute`.
- **Temi_SDK**: SDK oficial del robot Temi; provee `Robot.askQuestion()`, `Robot.startDefaultNlu()`, `Robot.addAsrListener()` y `Robot.removeAsrListener()`.
- **Keyword**: Palabra o frase corta definida por el estudiante que el ASR debe reconocer para activar una rama.
- **Matching**: Algoritmo de comparación case-insensitive que verifica si el texto ASR contiene el keyword.
- **Timeout_ASR**: Tiempo máximo de espera de respuesta ASR; fijado en 15 segundos.

---

## Requisitos

### Requisito 1: Definición del bloque temi_condition en Blockly

**User Story:** Como estudiante, quiero arrastrar un bloque de condición al workspace de Blockly, para que pueda programar a Temi para que haga una pregunta y reaccione según la respuesta.

#### Criterios de aceptación

1. THE Blockly_Workspace SHALL incluir una categoría llamada `"Condición"` con color `#c84b1f` que contenga el bloque `temi_condition`.
2. WHEN el estudiante arrastra el bloque `temi_condition` al workspace, THE Blockly_Workspace SHALL renderizar un campo `QUESTION` de tipo texto para ingresar la pregunta.
3. WHEN el estudiante arrastra el bloque `temi_condition` al workspace, THE Blockly_Workspace SHALL renderizar un campo `OPTION_COUNT` de tipo numérico con valor mínimo 2 y máximo 5.
4. WHEN el valor de `OPTION_COUNT` es N (2 ≤ N ≤ 5), THE Blockly_Workspace SHALL renderizar exactamente N grupos de campos `KEYWORD_i`, `ACTION_TYPE_i` y `ACTION_VALUE_i` para i de 1 a N.
5. THE bloque `temi_condition` SHALL conectarse en la cadena de bloques mediante `previousStatement` y `nextStatement`, permitiendo encadenarlo con otros bloques.
6. THE campo `ACTION_TYPE_i` SHALL ofrecer exactamente tres opciones en el dropdown: `Navigate`, `Say` y `ShowImage`.

---

### Requisito 2: Serialización del bloque temi_condition

**User Story:** Como sistema, quiero que el workspace de Blockly serialice correctamente el bloque `temi_condition`, para que el extractor pueda convertirlo en un comando ejecutable.

#### Criterios de aceptación

1. WHEN el estudiante configura un bloque `temi_condition`, THE Blockly_Workspace SHALL serializar los campos `QUESTION`, `OPTION_COUNT`, `KEYWORD_i`, `ACTION_TYPE_i` y `ACTION_VALUE_i` en el workspace state de Blockly.
2. THE workspace state serializado SHALL representar el campo `OPTION_COUNT` como un string numérico parseable a entero.
3. THE workspace state serializado SHALL incluir exactamente los campos correspondientes al valor de `OPTION_COUNT` configurado, sin campos adicionales de opciones no definidas.

---

### Requisito 3: Extracción del comando AskCondition

**User Story:** Como sistema, quiero que el extractor convierta el bloque `temi_condition` serializado en un `AskConditionCommand`, para que el robot pueda ejecutarlo.

#### Criterios de aceptación

1. WHEN el workspace contiene un bloque `temi_condition` con `QUESTION` no vacío y al menos 2 opciones válidas, THE Extractor SHALL producir exactamente un `AskConditionCommand` con la pregunta y las opciones en el mismo orden que aparecen en el bloque.
2. WHEN el workspace contiene un bloque `temi_condition` con `QUESTION` vacío, THE Extractor SHALL omitir el bloque y no incluir ningún `AskConditionCommand` en la lista de comandos.
3. WHEN el workspace contiene un bloque `temi_condition` con menos de 2 opciones válidas (keyword, actionType o actionValue vacíos), THE Extractor SHALL omitir el bloque y no incluir ningún `AskConditionCommand`.
4. WHEN una opción tiene `ACTION_TYPE_i` igual a `"Navigate"`, THE Extractor SHALL construir una `ConditionAction` de tipo `Navigate` con `location` igual al valor de `ACTION_VALUE_i`.
5. WHEN una opción tiene `ACTION_TYPE_i` igual a `"Say"`, THE Extractor SHALL construir una `ConditionAction` de tipo `Say` con `text` igual al valor de `ACTION_VALUE_i`.
6. WHEN una opción tiene `ACTION_TYPE_i` igual a `"ShowImage"`, THE Extractor SHALL construir una `ConditionAction` de tipo `ShowImage` con `imageBase64` igual al valor de `ACTION_VALUE_i`.
7. WHEN el workspace contiene múltiples bloques en secuencia, THE Extractor SHALL incluir el `AskConditionCommand` en la posición correcta dentro de la lista de comandos, respetando el orden de la cadena de bloques.

---

### Requisito 4: Serialización JSON del comando AskCondition

**User Story:** Como sistema, quiero que el comando `AskConditionCommand` se serialice correctamente en JSON, para que el servidor Android pueda parsearlo y ejecutarlo.

#### Criterios de aceptación

1. THE AskConditionCommand SHALL serializarse en JSON con la estructura `{ "type": "AskCondition", "question": "...", "options": [...] }`.
2. THE campo `options` del JSON SHALL ser un array donde cada elemento tiene la estructura `{ "keyword": "...", "action": { "type": "...", ... } }`.
3. WHEN la acción de una opción es `Navigate`, THE JSON SHALL incluir `{ "type": "Navigate", "location": "..." }` en el campo `action`.
4. WHEN la acción de una opción es `Say`, THE JSON SHALL incluir `{ "type": "Say", "text": "..." }` en el campo `action`.
5. WHEN la acción de una opción es `ShowImage`, THE JSON SHALL incluir `{ "type": "ShowImage", "imageBase64": "..." }` en el campo `action`.

---

### Requisito 5: Parsing del comando AskCondition en Android

**User Story:** Como sistema Android, quiero parsear el JSON del comando `AskCondition`, para que el `RobotCommandRunner` pueda ejecutarlo.

#### Criterios de aceptación

1. WHEN el `TemiLocationServer` recibe un JSON con un comando de tipo `"AskCondition"`, THE TemiLocationServer SHALL construir un objeto `RobotCommand.AskCondition` con la pregunta y la lista de `ConditionOption`.
2. WHEN el JSON de `AskCondition` contiene menos de 2 opciones válidas, THE TemiLocationServer SHALL omitir el comando y no añadirlo a la secuencia de ejecución.
3. WHEN el JSON de una opción contiene `"type": "Navigate"`, THE TemiLocationServer SHALL construir un `RobotCommand.Navigate` como acción de esa opción.
4. WHEN el JSON de una opción contiene `"type": "Say"`, THE TemiLocationServer SHALL construir un `RobotCommand.Say` como acción de esa opción.
5. WHEN el JSON de una opción contiene `"type": "ShowImage"`, THE TemiLocationServer SHALL construir un `RobotCommand.ShowImage` como acción de esa opción.
6. THE TemiLocationServer SHALL rechazar opciones cuyo campo `"type"` de acción no sea `"Navigate"`, `"Say"` ni `"ShowImage"`, omitiendo esa opción del array.

---

### Requisito 6: Ejecución del comando AskCondition en el robot

**User Story:** Como estudiante, quiero que el robot Temi haga la pregunta en voz alta y ejecute la acción correspondiente según la respuesta reconocida, para que la interacción sea dinámica.

#### Criterios de aceptación

1. WHEN el `RobotCommandRunner` ejecuta un `RobotCommand.AskCondition`, THE RobotCommandRunner SHALL invocar `speakAndWait(question)` antes de activar el ASR.
2. WHEN la pregunta ha sido pronunciada, THE RobotCommandRunner SHALL registrar un `AsrListener` y llamar a `Robot.startDefaultNlu()` para activar la escucha.
3. WHILE el ASR está activo, THE RobotCommandRunner SHALL esperar hasta 15 segundos a que `onAsrResult` sea invocado.
4. WHEN `onAsrResult` devuelve un texto que contiene el keyword de alguna opción (comparación case-insensitive, por contains), THE RobotCommandRunner SHALL ejecutar la acción de la primera opción cuyo keyword esté contenido en el texto ASR.
5. WHEN el ASR no devuelve resultado en 15 segundos o el texto no contiene ningún keyword, THE RobotCommandRunner SHALL retornar `Result.success(Unit)` y continuar con el siguiente comando de la secuencia sin ejecutar ninguna acción de las ramas.
6. THE RobotCommandRunner SHALL remover el `AsrListener` del SDK de Temi al finalizar la espera, independientemente de si hubo match, timeout o error.
7. IF `speakAndWait(question)` retorna `Result.failure`, THEN THE RobotCommandRunner SHALL retornar ese fallo sin activar el ASR.
8. IF la acción ejecutada tras el match retorna `Result.failure`, THEN THE RobotCommandRunner SHALL propagar ese fallo al `TemiLocationServer`.

---

### Requisito 7: Algoritmo de matching de keywords

**User Story:** Como sistema, quiero que el matching de keywords sea case-insensitive y por contenido (contains), para que pequeñas variaciones en la pronunciación no impidan el reconocimiento.

#### Criterios de aceptación

1. WHEN el texto ASR normalizado (lowercase, trim) contiene el keyword normalizado (lowercase, trim) de una opción, THE RobotCommandRunner SHALL considerar esa opción como coincidencia.
2. WHEN múltiples keywords coinciden con el texto ASR, THE RobotCommandRunner SHALL seleccionar la primera opción en el orden definido por el estudiante.
3. WHEN el texto ASR está vacío o es solo espacios, THE RobotCommandRunner SHALL retornar null (sin match) y no ejecutar ninguna acción.
4. THE matching SHALL ser insensible a mayúsculas y minúsculas; "Biblioteca", "BIBLIOTECA" y "biblioteca" SHALL ser equivalentes al comparar con el keyword `"biblioteca"`.

---

### Requisito 8: Integración con la misión "Taller Guía mi salón"

**User Story:** Como docente, quiero que el bloque `temi_condition` esté disponible en la misión "Taller Guía mi salón", para que los estudiantes puedan usarlo en su programa.

#### Criterios de aceptación

1. THE misión `mission-order-steps` SHALL incluir un paso de tipo `temi_condition` con label `"¡Pregunta al visitante!"` y helper `"Haz que Temi pregunte y reaccione según la respuesta."` en su lista de pasos.
2. THE `ProgramBlockType` SHALL incluir `"temi_condition"` como valor válido.
3. WHEN la secuencia del estudiante incluye un bloque `temi_condition` en la posición correcta, THE evaluateOrderSteps SHALL contarlo como un paso completado.
4. WHEN la categoría `"Condición"` está incluida en `allowedCategories` de la misión, THE Blockly_Workspace SHALL mostrar la categoría `"Condición"` en el toolbox.

---

### Requisito 9: Manejo de errores y casos límite

**User Story:** Como sistema, quiero manejar correctamente los casos de error y límite del bloque de condición, para que la experiencia del estudiante no se interrumpa inesperadamente.

#### Criterios de aceptación

1. IF el SDK de Temi no está disponible (`Robot.getInstance()` retorna null) al ejecutar `AskCondition`, THEN THE RobotCommandRunner SHALL retornar `Result.failure(IllegalStateException)`.
2. IF el `TemiLocationServer` recibe un `Result.failure` del `RobotCommandRunner`, THEN THE TemiLocationServer SHALL responder con HTTP 500 y un mensaje de error descriptivo.
3. WHEN el bloque `temi_condition` tiene campos incompletos, THE evaluateOrderSteps SHALL no contar ese bloque como paso completado, mostrando retroalimentación al estudiante.
4. THE bloque `temi_condition` SHALL aceptar un máximo de 5 opciones; THE Blockly_Workspace SHALL no permitir que `OPTION_COUNT` supere 5.
5. THE bloque `temi_condition` SHALL requerir un mínimo de 2 opciones; THE Blockly_Workspace SHALL no permitir que `OPTION_COUNT` sea menor que 2.
6. THE campo `QUESTION` SHALL aceptar un máximo de 200 caracteres.
7. IF una acción de rama es `Navigate` con una ubicación no registrada en el mapa del robot, THEN THE RobotCommandRunner SHALL retornar `Result.failure` con el error de navegación correspondiente.

