# Requirements Document

## Introduction

Este documento define los requisitos para reemplazar el sistema de autenticación demo hardcodeado de EduLab por autenticación real con Supabase Auth (email/contraseña + Google OAuth). La funcionalidad incluye la introducción de aislamiento de datos por docente mediante la columna `teacher_id` y Row Level Security (RLS) en Supabase, de modo que cada docente solo vea y modifique sus propios estudiantes, asignaciones y trabajos.

## Glossary

- **AuthStoreProvider**: Componente React que reemplaza a `DemoStoreProvider`. Gestiona la sesión de Supabase y expone el estado de autenticación a toda la aplicación.
- **Supabase_Auth**: Servicio de autenticación de Supabase que gestiona sesiones JWT, login con email/contraseña y OAuth.
- **RLS**: Row Level Security — mecanismo de Supabase que filtra filas en el servidor según políticas basadas en `auth.uid()`.
- **teacherId**: El `auth.uid()` del docente autenticado; se almacena en todas las filas de datos que le pertenecen.
- **Session**: Objeto que representa la sesión activa del usuario, incluyendo el JWT de acceso y los datos del usuario.
- **Row_Mapper**: Función pura que convierte entre filas de base de datos (snake_case) y tipos TypeScript (camelCase).
- **supabase_store**: Módulo `supabase-store.ts` que contiene todas las funciones de acceso a la base de datos.
- **LoginScreen**: Componente de UI que presenta el formulario de login al docente.
- **onAuthStateChange**: Suscripción de Supabase que notifica cambios de sesión (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`).

---

## Requirements

### Requirement 1: Autenticación con email y contraseña

**User Story:** Como docente, quiero iniciar sesión con mi correo institucional y contraseña, para acceder a mi panel de gestión de forma segura.

#### Acceptance Criteria

1. WHEN un docente envía un email y contraseña válidos, THE AuthStoreProvider SHALL invocar `supabase.auth.signInWithPassword` y retornar `{ ok: true }` al completarse exitosamente.
2. WHEN un docente envía credenciales inválidas, THE AuthStoreProvider SHALL retornar `{ ok: false }` con un mensaje de error en español.
3. WHEN Supabase Auth retorna el error `"Invalid login credentials"`, THE AuthStoreProvider SHALL mostrar el mensaje `"Correo o contraseña incorrectos."`.
4. WHEN Supabase Auth retorna el error `"Email not confirmed"`, THE AuthStoreProvider SHALL mostrar el mensaje `"Debes confirmar tu correo antes de ingresar."`.
5. IF Supabase Auth retorna un error desconocido, THEN THE AuthStoreProvider SHALL mostrar el mensaje `"No se pudo iniciar sesión. Intenta de nuevo."`.
6. WHEN la autenticación es exitosa, THE AuthStoreProvider SHALL establecer `teacherId` igual al `user.id` de la sesión retornada por Supabase.

---

### Requirement 2: Autenticación con Google OAuth

**User Story:** Como docente, quiero iniciar sesión con mi cuenta de Google, para acceder sin necesidad de recordar una contraseña adicional.

#### Acceptance Criteria

1. WHEN Google OAuth retorna un `idToken` válido, THE AuthStoreProvider SHALL invocar `supabase.auth.signInWithIdToken` con el proveedor `"google"` y el token recibido.
2. WHEN `signInWithIdToken` completa exitosamente, THE AuthStoreProvider SHALL retornar `{ ok: true }` y establecer la sesión.
3. IF `signInWithIdToken` retorna un error, THEN THE AuthStoreProvider SHALL retornar `{ ok: false }` con el mensaje `"No se pudo iniciar sesión con Google."`.
4. WHEN la autenticación con Google es exitosa, THE AuthStoreProvider SHALL establecer `teacherId` igual al `user.id` de la sesión retornada por Supabase.

---

### Requirement 3: Carga de datos del docente al iniciar sesión

**User Story:** Como docente, quiero que mis datos (estudiantes, asignaciones, trabajos y perfil) se carguen automáticamente al iniciar sesión, para ver solo mi información sin configuración adicional.

#### Acceptance Criteria

1. WHEN `onAuthStateChange` dispara el evento `SIGNED_IN`, THE AuthStoreProvider SHALL cargar en paralelo los estudiantes, asignaciones, trabajos de estudiantes y perfil del docente autenticado.
2. WHEN los datos son cargados desde Supabase, THE AuthStoreProvider SHALL almacenar únicamente las filas donde `teacher_id` es igual al `auth.uid()` del docente autenticado.
3. WHEN la aplicación inicializa con una sesión de Supabase existente, THE AuthStoreProvider SHALL restaurar la sesión y cargar los datos del docente sin requerir un nuevo login.
4. IF una query de carga falla, THEN THE AuthStoreProvider SHALL retornar una lista vacía para esa entidad y registrar el error en consola sin interrumpir la carga de las demás entidades.

---

### Requirement 4: Aislamiento de datos por docente (escritura)

**User Story:** Como docente, quiero que todos los registros que creo queden asociados a mi cuenta, para que otros docentes no puedan ver ni modificar mis datos.

#### Acceptance Criteria

1. WHEN un docente crea un estudiante, THE AuthStoreProvider SHALL asignar `teacher_id` igual al `teacherId` del docente autenticado en el registro persistido.
2. WHEN un docente crea una asignación, THE AuthStoreProvider SHALL asignar `teacher_id` igual al `teacherId` del docente autenticado en el registro persistido.
3. WHEN un docente guarda o envía un trabajo de estudiante, THE AuthStoreProvider SHALL asignar `teacher_id` igual al `teacherId` del docente autenticado en el registro persistido.
4. WHILE el docente no está autenticado, THE AuthStoreProvider SHALL rechazar cualquier operación de escritura sin persistir datos.

---

### Requirement 5: Esquema de base de datos con teacher_id

**User Story:** Como administrador del sistema, quiero que las tablas de datos tengan una columna `teacher_id`, para que RLS pueda aislar los datos por docente en el servidor.

#### Acceptance Criteria

1. THE tabla `students` SHALL tener una columna `teacher_id` de tipo `UUID` con referencia a `auth.users(id)`.
2. THE tabla `assignments` SHALL tener una columna `teacher_id` de tipo `UUID` con referencia a `auth.users(id)`.
3. THE tabla `student_works` SHALL tener una columna `teacher_id` de tipo `UUID` con referencia a `auth.users(id)`.
4. THE tabla `teacher_profiles` SHALL tener una columna `teacher_id` de tipo `UUID` con referencia a `auth.users(id)`.
5. THE base de datos SHALL tener índices en la columna `teacher_id` de las tablas `students`, `assignments` y `student_works` para garantizar performance en las queries filtradas.

---

### Requirement 6: Row Level Security (RLS)

**User Story:** Como administrador del sistema, quiero que RLS esté habilitado en todas las tablas de datos, para garantizar el aislamiento de datos en el servidor independientemente del cliente.

#### Acceptance Criteria

1. THE tabla `students` SHALL tener RLS habilitado con una política que permita acceso únicamente a filas donde `teacher_id = auth.uid()`.
2. THE tabla `assignments` SHALL tener RLS habilitado con una política que permita acceso únicamente a filas donde `teacher_id = auth.uid()`.
3. THE tabla `student_works` SHALL tener RLS habilitado con una política que permita acceso únicamente a filas donde `teacher_id = auth.uid()`.
4. THE tabla `teacher_profiles` SHALL tener RLS habilitado con una política que permita acceso únicamente a filas donde `teacher_id = auth.uid()`.
5. WHEN un docente intenta leer filas de otro docente, THE Supabase_Auth SHALL retornar un conjunto vacío de resultados sin exponer datos ajenos.
6. WHEN un docente intenta escribir una fila con un `teacher_id` diferente a su `auth.uid()`, THE Supabase_Auth SHALL rechazar la operación con error de privilegios insuficientes.

---

### Requirement 7: Cierre de sesión

**User Story:** Como docente, quiero poder cerrar sesión de forma segura, para que mis datos no queden accesibles en dispositivos compartidos.

#### Acceptance Criteria

1. WHEN un docente invoca `logout()`, THE AuthStoreProvider SHALL llamar a `supabase.auth.signOut()`.
2. WHEN `supabase.auth.signOut()` completa, THE AuthStoreProvider SHALL establecer `session` en `null` y `teacherId` en `null`.
3. WHEN el cierre de sesión es exitoso, THE AuthStoreProvider SHALL vaciar los arrays `students`, `assignments` y `studentWorks` en memoria.
4. WHEN el cierre de sesión es exitoso, THE AuthStoreProvider SHALL establecer `profile` en `null`.
5. WHEN `onAuthStateChange` dispara el evento `SIGNED_OUT`, THE AuthStoreProvider SHALL limpiar todos los datos del docente en memoria.

---

### Requirement 8: Gestión de sesión persistente y expiración de token

**User Story:** Como docente, quiero que mi sesión se mantenga activa entre recargas de página y que se renueve automáticamente, para no tener que iniciar sesión repetidamente.

#### Acceptance Criteria

1. WHEN la aplicación carga y existe una sesión válida en el almacenamiento del cliente, THE AuthStoreProvider SHALL restaurar la sesión sin requerir login.
2. WHEN el JWT de acceso expira y existe un refresh token válido, THE Supabase_Auth SHALL renovar el token automáticamente mediante el evento `TOKEN_REFRESHED`.
3. WHEN el JWT no puede ser renovado, THE AuthStoreProvider SHALL redirigir al docente a la página de login al recibir el evento `SIGNED_OUT`.
4. WHEN el AuthStoreProvider se desmonta, THE AuthStoreProvider SHALL cancelar la suscripción a `onAuthStateChange` para evitar memory leaks.

---

### Requirement 9: Mapeo de datos con teacher_id (Row Mappers)

**User Story:** Como desarrollador, quiero que los mappers entre filas de base de datos y tipos TypeScript incluyan el campo `teacher_id`/`teacherId`, para garantizar consistencia entre la capa de datos y la lógica de negocio.

#### Acceptance Criteria

1. THE `rowToStudent` mapper SHALL convertir la columna `teacher_id` de la base de datos al campo `teacherId` del tipo `Student`.
2. THE `studentToRow` mapper SHALL convertir el campo `teacherId` del tipo `Student` a la columna `teacher_id` para persistencia.
3. THE `rowToAssignment` mapper SHALL convertir la columna `teacher_id` de la base de datos al campo `teacherId` del tipo `Assignment`.
4. THE `rowToStudentWork` mapper SHALL convertir la columna `teacher_id` de la base de datos al campo `teacherId` del tipo `StudentWork`.
5. FOR ALL objetos `Student` válidos, serializar con `studentToRow` y luego deserializar con `rowToStudent` SHALL producir un objeto equivalente al original (propiedad de round-trip).
6. FOR ALL objetos `Assignment` válidos, serializar con `assignmentToRow` y luego deserializar con `rowToAssignment` SHALL producir un objeto equivalente al original (propiedad de round-trip).

---

### Requirement 10: Actualización de tipos TypeScript

**User Story:** Como desarrollador, quiero que los tipos TypeScript reflejen el nuevo campo `teacherId`, para garantizar type-safety en toda la aplicación.

#### Acceptance Criteria

1. THE tipo `Student` SHALL incluir el campo `teacherId: string` como campo requerido.
2. THE tipo `Assignment` SHALL incluir el campo `teacherId: string` como campo requerido.
3. THE tipo `StudentWork` SHALL incluir el campo `teacherId: string` como campo requerido.
4. THE tipo `TeacherProfile` SHALL incluir el campo `teacherId: string` como campo requerido.
5. THE interfaz `AuthStore` SHALL exponer `teacherId: string | null` que refleja el `auth.uid()` del docente autenticado o `null` si no hay sesión activa.
