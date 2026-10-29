# Documento de Requisitos

## Introducción

Esta funcionalidad permite a los docentes de EduLab crear misiones personalizadas de robótica directamente desde la biblioteca de misiones. Actualmente las misiones están hardcodeadas en `demo-data.ts` y son compartidas por todos los docentes. Con esta funcionalidad, cada docente podrá diseñar sus propias misiones, guardarlas en base de datos ligadas a su `teacherId`, verlas en su biblioteca personal y asignarlas a sus cursos exactamente igual que las misiones estáticas existentes.

## Glosario

- **Mission_Creator**: El componente modal que permite al docente crear una misión personalizada.
- **Custom_Mission**: Una misión creada por un docente específico, almacenada en la tabla `missions` de PostgreSQL y asociada a su `teacherId`.
- **Mission_Library**: La pantalla de biblioteca de misiones (`LibraryScreen`) donde se listan y filtran las misiones disponibles.
- **MissionStep**: Un paso de la misión compuesto por tipo de bloque (`ProgramBlockType`), etiqueta y texto de ayuda.
- **Outcome**: Un resultado de aprendizaje expresado como texto libre.
- **AllowedCategory**: Una categoría de bloques Blockly que el estudiante puede usar al resolver la misión (`Movimiento`, `Hablar`, `Mostrar`, `Audio`, `Condición`, `Control`).
- **AgeBand**: Rango de edad objetivo de la misión (`7-10`, `9-10`, `11-14`, `15-18`).
- **MissionCategory**: Categoría pedagógica de la misión (`Fundamentos`, `Logica`, `Control`, `Robotica`).
- **Teacher**: El docente autenticado cuyo `teacherId` identifica la sesión activa en `AuthStore`.
- **AuthStore**: El store principal de la aplicación (`auth-store-provider.tsx`) que expone el estado global y las acciones.
- **DB_Store**: El módulo `db-store.ts` que ejecuta consultas SQL contra PostgreSQL.

---

## Requisitos

### Requisito 1: Botón de creación en la biblioteca

**User Story:** Como docente, quiero un botón "Crear misión" visible en la biblioteca de misiones, para poder iniciar el flujo de creación sin salir de la pantalla.

#### Criterios de Aceptación

1. THE Mission_Library SHALL mostrar un botón con la etiqueta "Crear misión" ubicado junto al selector de filtro de edad.
2. WHEN el docente hace clic en el botón "Crear misión", THE Mission_Library SHALL abrir el Mission_Creator en un modal superpuesto.
3. WHILE el docente no tiene sesión activa (`teacherId` es `null`), THE Mission_Library SHALL deshabilitar el botón "Crear misión".

---

### Requisito 2: Formulario de creación de misión

**User Story:** Como docente, quiero un formulario completo dentro del modal, para poder definir todos los atributos de mi misión personalizada.

#### Criterios de Aceptación

1. THE Mission_Creator SHALL presentar campos de entrada para: título (texto), resumen (texto largo), categoría (selector), rango de edad (selector), duración en minutos (número entero positivo).
2. THE Mission_Creator SHALL presentar una sección de resultados de aprendizaje (outcomes) con al menos un campo de texto y un botón para agregar más entradas.
3. THE Mission_Creator SHALL presentar una sección de pasos de misión (steps) donde cada paso tiene: tipo de bloque (`ProgramBlockType`, selector), etiqueta (texto) y texto de ayuda (texto).
4. THE Mission_Creator SHALL presentar una sección de categorías de bloques permitidos (allowedCategories) con casillas de verificación para cada opción: `Movimiento`, `Hablar`, `Mostrar`, `Audio`, `Condición`, `Control`.
5. WHEN el docente hace clic en "Agregar resultado", THE Mission_Creator SHALL añadir un nuevo campo de texto vacío a la lista de outcomes.
6. WHEN el docente hace clic en "Agregar paso", THE Mission_Creator SHALL añadir una nueva fila de paso vacía a la lista de steps.
7. WHEN el docente hace clic en el botón de eliminar junto a un outcome, THE Mission_Creator SHALL remover ese outcome de la lista, siempre que quede al menos un outcome.
8. WHEN el docente hace clic en el botón de eliminar junto a un paso, THE Mission_Creator SHALL remover ese paso de la lista.

---

### Requisito 3: Validación del formulario

**User Story:** Como docente, quiero que el formulario valide los datos antes de guardar, para evitar crear misiones incompletas o inválidas.

#### Criterios de Aceptación

1. WHEN el docente intenta guardar con el campo título vacío o compuesto únicamente de espacios en blanco, THE Mission_Creator SHALL impedir el envío y mostrar un mensaje de error en el campo título.
2. WHEN el docente intenta guardar con el campo resumen vacío o compuesto únicamente de espacios en blanco, THE Mission_Creator SHALL impedir el envío y mostrar un mensaje de error en el campo resumen.
3. WHEN el docente intenta guardar con duración menor o igual a cero, THE Mission_Creator SHALL impedir el envío y mostrar un mensaje de error en el campo duración.
4. WHEN el docente intenta guardar con al menos un outcome cuyo texto es vacío o solo espacios en blanco, THE Mission_Creator SHALL impedir el envío y resaltar el campo de outcome inválido.
5. WHEN el docente intenta guardar con al menos un paso cuyo campo etiqueta o helper es vacío o solo espacios en blanco, THE Mission_Creator SHALL impedir el envío y resaltar el campo de paso inválido.
6. IF el formulario contiene errores de validación, THEN THE Mission_Creator SHALL mantener el modal abierto y el estado del formulario sin cambios.

---

### Requisito 4: Persistencia de la misión personalizada

**User Story:** Como docente, quiero que mi misión personalizada se guarde en la base de datos, para que persista entre sesiones y sea accesible solo para mí.

#### Criterios de Aceptación

1. WHEN el docente envía un formulario válido, THE Mission_Creator SHALL enviar una petición `POST` al endpoint `/api/teacher/create-mission` con todos los campos de la misión y el `teacherId` de la sesión activa.
2. WHEN la petición al endpoint es exitosa, THE AuthStore SHALL añadir la nueva Custom_Mission a la lista de misiones en memoria sin recargar la página.
3. WHEN la petición al endpoint es exitosa, THE Mission_Creator SHALL cerrar el modal y mostrar la nueva misión en la Mission_Library.
4. IF la petición al endpoint falla, THEN THE Mission_Creator SHALL mantener el modal abierto y mostrar un mensaje de error genérico al docente.
5. THE DB_Store SHALL insertar la Custom_Mission en la tabla `missions` de PostgreSQL con los campos: `id`, `teacher_id`, `title`, `summary`, `category`, `age_band`, `duration_minutes`, `outcomes` (JSONB), `steps` (JSONB), `allowed_categories` (JSONB), `status`, `cover_tone`, `created_at`.

---

### Requisito 5: Visibilidad de misiones personalizadas

**User Story:** Como docente, quiero ver mis misiones personalizadas en mi biblioteca junto a las misiones estáticas, para poder gestionarlas desde un único lugar.

#### Criterios de Aceptación

1. WHEN el docente carga la Mission_Library, THE AuthStore SHALL combinar las misiones estáticas de `demoMissions` con las Custom_Missions del docente autenticado obtenidas desde la base de datos.
2. THE Mission_Library SHALL aplicar los filtros de categoría y rango de edad tanto a las misiones estáticas como a las Custom_Missions.
3. THE Mission_Library SHALL mostrar un indicador visual (etiqueta "Personalizada") en las tarjetas de Custom_Mission para distinguirlas de las misiones estáticas.
4. WHILE el docente A tiene sesión activa, THE Mission_Library SHALL mostrar únicamente las Custom_Missions cuyo `teacher_id` coincide con el `teacherId` del docente A.

---

### Requisito 6: Asignación de misiones personalizadas

**User Story:** Como docente, quiero asignar mis misiones personalizadas a mis cursos, para que mis estudiantes puedan resolverlas igual que las misiones estáticas.

#### Criterios de Aceptación

1. THE Mission_Library SHALL mostrar los botones "Vista previa" y "Asignar" en las tarjetas de Custom_Mission, con el mismo comportamiento que en las misiones estáticas.
2. WHEN el docente asigna una Custom_Mission a un curso, THE AuthStore SHALL crear un registro en la tabla `assignments` usando el `id` de la Custom_Mission como `mission_id`.
3. WHEN un estudiante accede a una misión asignada que es una Custom_Mission, THE System SHALL resolver los datos de la misión desde la tabla `missions` de la base de datos en lugar de `demoMissions`.

---

### Requisito 7: Carga de misiones personalizadas al iniciar sesión

**User Story:** Como docente, quiero que mis misiones personalizadas se carguen automáticamente al iniciar sesión, para no tener que hacer ninguna acción adicional.

#### Criterios de Aceptación

1. WHEN el docente inicia sesión exitosamente, THE AuthStore SHALL solicitar las Custom_Missions del docente al endpoint `/api/teacher/data` junto con los demás datos del docente.
2. THE endpoint `/api/teacher/data` SHALL retornar las Custom_Missions del docente en el campo `missions` de la respuesta JSON.
3. WHEN la respuesta del endpoint incluye misiones, THE AuthStore SHALL combinar esas misiones con `demoMissions` para construir la lista completa de misiones disponibles.
