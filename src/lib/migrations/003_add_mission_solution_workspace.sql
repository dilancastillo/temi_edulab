-- Solución en bloques que arma el docente al crear o editar una misión.
-- Los pasos (columna steps) se generan a partir de ella; se guarda para poder
-- volver a abrir y editar la solución tal como se armó.
ALTER TABLE missions ADD COLUMN IF NOT EXISTS solution_workspace JSONB;
