/**
 * Copia local (localStorage) del programa de bloques de un estudiante.
 *
 * Se escribe en cada cambio y se borra solo cuando el servidor confirma el guardado.
 * Si la conexión falla o se cierra la pestaña, el trabajo se recupera desde aquí.
 */

export type WorkDraft = {
  workspaceState: unknown;
  stepIndex: number;
  missionId: string;
  /** Momento del último cambio (ms desde epoch). */
  updatedAt: number;
};

const PREFIX = "esbot.workDraft.v1";

export function draftKey(studentId: string, assignmentId: string): string {
  return `${PREFIX}.${studentId}.${assignmentId}`;
}

export function readDraft(studentId: string, assignmentId: string): WorkDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(studentId, assignmentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkDraft>;
    if (typeof parsed.updatedAt !== "number" || typeof parsed.missionId !== "string") return null;
    return {
      workspaceState: parsed.workspaceState,
      stepIndex: typeof parsed.stepIndex === "number" ? parsed.stepIndex : 0,
      missionId: parsed.missionId,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function writeDraft(studentId: string, assignmentId: string, draft: WorkDraft): void {
  try {
    window.localStorage.setItem(draftKey(studentId, assignmentId), JSON.stringify(draft));
  } catch {
    // Almacenamiento lleno o bloqueado (modo privado): el guardado en el servidor sigue funcionando.
  }
}

/**
 * Borra el borrador solo si no hubo cambios después del guardado confirmado,
 * para no perder lo que el estudiante editó mientras la petición estaba en curso.
 */
export function clearDraftIfSaved(studentId: string, assignmentId: string, savedChangeAt: number): void {
  const current = readDraft(studentId, assignmentId);
  if (current && current.updatedAt > savedChangeAt) return;
  try {
    window.localStorage.removeItem(draftKey(studentId, assignmentId));
  } catch {
    // Ignorar: un borrador sobrante solo se vuelve a sincronizar.
  }
}

/**
 * Decide si el borrador local es más nuevo que lo que hay en el servidor
 * (por ejemplo, porque el último guardado no llegó).
 */
export function isDraftNewer(draft: WorkDraft | null, serverUpdatedAt?: string): draft is WorkDraft {
  if (!draft) return false;
  if (!serverUpdatedAt) return true;
  const serverTime = Date.parse(serverUpdatedAt);
  return Number.isNaN(serverTime) || draft.updatedAt > serverTime;
}
