-- Robot asignado al docente. Lo usa /api/teacher/update-robot-id para guardarlo
-- y /api/student/data para que el estudiante use el mismo robot.
-- Producción ya tiene esta columna (se agregó a mano); IF NOT EXISTS la hace segura de re-ejecutar.
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS robot_id TEXT;
