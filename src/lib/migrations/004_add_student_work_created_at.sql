-- Fecha del primer guardado de cada trabajo del estudiante (se usa como "Inicio"
-- en el reporte de actividad). Los guardados siguientes no la tocan.
-- Los trabajos anteriores a esta migración quedan en NULL: no se inventa una fecha
-- y el reporte simplemente no muestra "Inicio" para ellos.
ALTER TABLE student_works ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
