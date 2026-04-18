# Plan de Implementación: teacher-auth

## Descripción general

Reemplazar el sistema de autenticación demo hardcodeado por autenticación real con Supabase Auth (email/contraseña + Google OAuth), introduciendo aislamiento de datos por docente mediante `teacher_id` y Row Level Security (RLS). El cambio es aditivo: se extienden los tipos TypeScript, se actualizan los row mappers y las funciones de fetch/upsert, se crea `AuthStoreProvider` que reemplaza a `DemoStoreProvider`, y se actualiza `LoginScreen` para usar Supabase Auth.

## Tareas

- [x] 1. Actualizar tipos TypeScript con el campo `teacherId`
  - Agregar `teacherId: string` como campo requerido en los tipos `Student`, `Assignment`, `StudentWork` y `TeacherProfile` en `src/lib/types.ts`
  - Agregar la interfaz `AuthStore` con `teacherId: string | null` y los tipos auxiliares `AuthResult`, `AssignMissionInput`, `SaveStudentWorkInput`, `SubmitStudentWorkInput`
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Actualizar row mappers en `supabase-store.ts`
  - [x] 2.1 Actualizar `rowToStudent` para leer `teacher_id` → `teacherId` y `studentToRow` para escribir `teacherId` → `teacher_id`
    - _Requirements: 9.1, 9.2_

  - [ ]* 2.2 Escribir property test para round-trip de `Student` (Propiedad 6)
    - **Propiedad 6: Round-trip de serialización de Student preserva todos los campos**
    - **Valida: Requirement 9.5**

  - [x] 2.3 Actualizar `rowToAssignment` para leer `teacher_id` → `teacherId` y `assignmentToRow` para escribir `teacherId` → `teacher_id`
    - _Requirements: 9.3_

  - [ ]* 2.4 Escribir property test para round-trip de `Assignment` (Propiedad 7)
    - **Propiedad 7: Round-trip de serialización de Assignment preserva todos los campos**
    - **Valida: Requirement 9.6**

  - [x] 2.5 Actualizar `rowToStudentWork` para leer `teacher_id` → `teacherId` y `studentWorkToRow` para escribir `teacherId` → `teacher_id`
    - _Requirements: 9.4_

  - [x] 2.6 Actualizar `rowToProfile` y `profileToRow` para incluir `teacher_id` ↔ `teacherId`
    - _Requirements: 10.4_

- [x] 3. Actualizar funciones fetch y upsert en `supabase-store.ts` para filtrar por `teacherId`
  - Actualizar `fetchStudents(teacherId: string)`, `fetchAssignments(teacherId: string)` y `fetchStudentWorks(teacherId: string)` para recibir `teacherId` y agregar `.eq("teacher_id", teacherId)` a la query
  - Actualizar `upsertStudent`, `upsertAssignment` y `upsertStudentWork` para recibir `teacherId` e incluirlo en el payload del row mapper
  - Actualizar `fetchProfile` para filtrar por `teacher_id` en lugar de `id`
  - _Requirements: 3.2, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_

- [x] 4. Checkpoint — Verificar que los tipos compilan y los mappers son consistentes
  - Ejecutar `tsc --noEmit` y corregir errores de tipos antes de continuar
  - Asegurar que todos los tests de round-trip pasan

- [x] 5. Crear `AuthStoreProvider` en `src/components/auth-store-provider.tsx`
  - [x] 5.1 Implementar la suscripción a `supabase.auth.onAuthStateChange` y la restauración de sesión con `supabase.auth.getSession` al montar
    - Cargar datos del docente en paralelo con `Promise.all` al recibir `SIGNED_IN`
    - Limpiar estado en memoria al recibir `SIGNED_OUT`
    - Cancelar la suscripción al desmontar el componente
    - _Requirements: 3.1, 3.3, 8.1, 8.2, 8.3, 8.4_

  - [x] 5.2 Implementar `loginWithPassword` usando `supabase.auth.signInWithPassword` y `mapSupabaseError`
    - Implementar `mapSupabaseError(message: string): string` para traducir errores al español
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 5.3 Escribir property test para `mapSupabaseError` (Propiedad 8)
    - **Propiedad 8: `mapSupabaseError` retorna mensaje en español para cualquier input desconocido**
    - **Valida: Requirement 1.5**

  - [x] 5.4 Implementar `loginWithGoogle` usando `supabase.auth.signInWithIdToken` con proveedor `"google"`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 5.5 Escribir property test para credenciales inválidas (Propiedad 1)
    - **Propiedad 1: Credenciales inválidas siempre retornan `{ ok: false }`**
    - **Valida: Requirement 1.2**

  - [x] 5.6 Implementar `logout` usando `supabase.auth.signOut` y limpiar todo el estado en memoria
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 5.7 Escribir property test para `logout` (Propiedad 5)
    - **Propiedad 5: `logout()` limpia completamente el estado en memoria**
    - **Valida: Requirements 7.2, 7.3, 7.4**

  - [x] 5.8 Implementar `addStudent`, `updateStudent`, `deleteStudent` e `importStudents` inyectando `teacherId` en cada operación de escritura
    - Agregar guard `if (!teacherId) return` en todas las operaciones de escritura
    - _Requirements: 4.1, 4.4_

  - [ ]* 5.9 Escribir property test para inyección de `teacherId` en escritura (Propiedad 4)
    - **Propiedad 4: Escritura siempre inyecta el `teacherId` del docente autenticado**
    - **Valida: Requirements 4.1, 4.2, 4.3**

  - [x] 5.10 Implementar `assignMission`, `archiveAssignment` y `deleteAssignment` inyectando `teacherId`
    - _Requirements: 4.2, 4.4_

  - [x] 5.11 Implementar `saveStudentWork`, `submitStudentWork` inyectando `teacherId`
    - _Requirements: 4.3, 4.4_

  - [x] 5.12 Implementar `updateProfile` y `loginStudentWithMissionCode` (sin cambios funcionales, solo adaptados al nuevo store)
    - _Requirements: 3.1_

  - [x] 5.13 Exportar `useAuthStore` hook y el contexto `AuthStoreContext`
    - _Requirements: 10.5_

- [x] 6. Checkpoint — Verificar que `AuthStoreProvider` compila sin errores de tipos
  - Ejecutar `tsc --noEmit` y corregir errores antes de continuar

- [x] 7. Actualizar `LoginScreen` para usar `AuthStoreProvider`
  - Reemplazar la importación de `useDemoStore` por `useAuthStore`
  - Actualizar `handleSubmit` para llamar `await loginWithPassword(email, password)` (ahora es async)
  - Actualizar `handleGoogleSuccess` para llamar `await loginWithGoogle(credentialResponse.credential)`
  - Eliminar la redirección manual post-login (el `useEffect` con `session` ya la maneja)
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 8. Reemplazar `DemoStoreProvider` por `AuthStoreProvider` en el árbol de componentes
  - Actualizar `src/app/layout.tsx` (o el archivo raíz que envuelve la app) para usar `AuthStoreProvider` en lugar de `DemoStoreProvider`
  - Actualizar todas las importaciones de `useDemoStore` en los componentes de la app para usar `useAuthStore`
  - _Requirements: 3.1, 3.3_

- [ ] 9. Escribir property tests para aislamiento de datos (Propiedades 2 y 3)
  - [ ]* 9.1 Escribir property test para `teacherId` refleja `auth.uid()` tras autenticación (Propiedad 2)
    - **Propiedad 2: `teacherId` siempre refleja `auth.uid()` tras autenticación exitosa**
    - **Valida: Requirements 1.6, 2.4**

  - [ ]* 9.2 Escribir property test para aislamiento de fetch (Propiedad 3)
    - **Propiedad 3: Fetch nunca retorna filas de otro docente**
    - **Valida: Requirements 3.2, 6.5**

- [x] 10. Crear script SQL de migración en `supabase/migrations/add_teacher_id.sql`
  - Incluir `ALTER TABLE` para agregar `teacher_id UUID REFERENCES auth.users(id)` en `students`, `assignments`, `student_works` y `teacher_profiles`
  - Incluir `CREATE INDEX` en `teacher_id` para las tres primeras tablas
  - Incluir `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` y `CREATE POLICY "teacher_isolation"` para cada tabla
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_

- [x] 11. Checkpoint final — Ejecutar suite de tests completa
  - Ejecutar `vitest run` y asegurar que todos los tests pasan
  - Ejecutar `tsc --noEmit` para confirmar que no hay errores de tipos

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los property tests usan `fast-check` (ya instalado en el proyecto)
- El script SQL de migración debe ejecutarse manualmente en el dashboard de Supabase antes de desplegar
- Los registros existentes sin `teacher_id` quedarán inaccesibles por RLS hasta migrarlos manualmente
