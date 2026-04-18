-- =============================================================================
-- Migración: Agregar teacher_id para aislamiento de datos por docente
-- =============================================================================
-- Este script es idempotente: usa IF NOT EXISTS y DO $$ ... $$ para evitar
-- errores si se ejecuta más de una vez.
--
-- Pasos:
--   1. Agregar columna teacher_id (FK a auth.users) en las 4 tablas
--   2. Crear índices en teacher_id para las 3 tablas de datos
--   3. Habilitar Row Level Security (RLS) en las 4 tablas
--   4. Crear políticas de aislamiento por docente
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Agregar columna teacher_id
-- -----------------------------------------------------------------------------

-- students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE students
      ADD COLUMN teacher_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Agregar columna password a students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'password'
  ) THEN
    ALTER TABLE students ADD COLUMN password TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE assignments
      ADD COLUMN teacher_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- student_works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_works' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE student_works
      ADD COLUMN teacher_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- teacher_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_profiles' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE teacher_profiles
      ADD COLUMN teacher_id UUID REFERENCES auth.users(id);
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 2. Crear índices en teacher_id (mejoran performance de las queries RLS)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_students_teacher_id
  ON students(teacher_id);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id
  ON assignments(teacher_id);

CREATE INDEX IF NOT EXISTS idx_student_works_teacher_id
  ON student_works(teacher_id);


-- -----------------------------------------------------------------------------
-- 3. Habilitar Row Level Security en las 4 tablas
-- -----------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY es idempotente: no falla si ya está habilitado.

ALTER TABLE students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_works     ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles  ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- 4. Crear políticas de aislamiento por docente
-- -----------------------------------------------------------------------------
-- Cada docente solo puede ver y modificar sus propias filas (teacher_id = auth.uid()).
-- Se usa DROP POLICY IF EXISTS antes de CREATE para que el script sea idempotente.

-- students
DROP POLICY IF EXISTS "teacher_isolation" ON students;
CREATE POLICY "teacher_isolation" ON students
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- assignments
DROP POLICY IF EXISTS "teacher_isolation" ON assignments;
CREATE POLICY "teacher_isolation" ON assignments
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- student_works
DROP POLICY IF EXISTS "teacher_isolation" ON student_works;
CREATE POLICY "teacher_isolation" ON student_works
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- teacher_profiles
-- Nota: se usa el mismo nombre "teacher_isolation" para consistencia,
-- aunque en el diseño se menciona "teacher_own_profile" como alternativa.
DROP POLICY IF EXISTS "teacher_isolation" ON teacher_profiles;
CREATE POLICY "teacher_isolation" ON teacher_profiles
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());
