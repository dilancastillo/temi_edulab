-- Calificación del docente sobre el trabajo de un estudiante en una misión.
-- grade: texto corto libre (4.5, 85, A, Superior...), porque cada colegio califica distinto.
-- feedback: comentario opcional. graded_at: cuándo se calificó.
-- mission_title: copia del nombre de la misión al calificar, para que el estudiante siga
-- viendo su misión calificada aunque el docente archive o borre la misión o la asignación.
-- El estado 'graded' (Calificado) se suma a 'draft' y 'submitted' en la columna status.
ALTER TABLE student_works ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE student_works ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE student_works ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE student_works ADD COLUMN IF NOT EXISTS mission_title TEXT;

-- Igual que producción: el juego libre (assignment_id = 'free-play') no es una asignación
-- real, y al borrar una asignación sus trabajos calificados se conservan.
ALTER TABLE student_works DROP CONSTRAINT IF EXISTS student_works_assignment_id_fkey;
