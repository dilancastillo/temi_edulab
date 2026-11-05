"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearDraftIfSaved, writeDraft, type WorkDraft } from "@/lib/work-drafts";

export type SaveStatus = "saved" | "dirty" | "saving" | "offline" | "error";
export type SaveResult = { ok: boolean; offline?: boolean; message?: string };
export type WorkPayload = { workspaceState: unknown; stepIndex: number };

type Options = {
  studentId: string;
  assignmentId: string;
  missionId: string;
  /** Persiste el trabajo en el servidor. */
  save: (payload: WorkPayload) => Promise<SaveResult>;
  /** Borrador local más nuevo que el servidor, recuperado al abrir: se sincroniza enseguida. */
  restoredDraft?: WorkDraft | null;
  /** Se llama cuando ya no queda nada sin enviar al servidor. */
  onSynced?: () => void;
  autosaveDelayMs?: number;
  retryDelayMs?: number;
};

type PendingChange = { payload: WorkPayload; changedAt: number };

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/** Huella del programa para saber si de verdad cambió (Blockly emite eventos al cargar sin cambiar nada). */
function fingerprint(workspaceState: unknown): string {
  try {
    return JSON.stringify(workspaceState) ?? "";
  } catch {
    return String(Date.now());
  }
}

/**
 * Guarda el programa del estudiante sin perder trabajo con mala conexión:
 * - cada cambio se copia al instante en localStorage (borrador);
 * - unos segundos después del último cambio se envía al servidor;
 * - si falla, se reintenta solo (y al volver la conexión) sin borrar el borrador;
 * - el borrador se elimina únicamente cuando el servidor confirma.
 */
export function useWorkAutosave({
  studentId,
  assignmentId,
  missionId,
  save,
  restoredDraft = null,
  onSynced,
  autosaveDelayMs = 4000,
  retryDelayMs = 15000,
}: Options) {
  const [status, setStatus] = useState<SaveStatus>(restoredDraft ? "dirty" : "saved");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const saveRef = useRef(save);
  const onSyncedRef = useRef(onSynced);
  useEffect(() => {
    saveRef.current = save;
    onSyncedRef.current = onSynced;
  });

  const pendingRef = useRef<PendingChange | null>(
    restoredDraft
      ? {
          payload: { workspaceState: restoredDraft.workspaceState, stepIndex: restoredDraft.stepIndex },
          changedAt: restoredDraft.updatedAt,
        }
      : null
  );
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Último contenido conocido (guardado, pendiente o el que se cargó al abrir).
  const lastFingerprintRef = useRef<string | null>(
    restoredDraft ? fingerprint(restoredDraft.workspaceState) : null
  );
  const flushRef = useRef<() => Promise<SaveResult>>(async () => ({ ok: true }));

  const schedule = useCallback((delayMs: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushRef.current();
    }, delayMs);
  }, []);

  const flush = useCallback(async (): Promise<SaveResult> => {
    const pending = pendingRef.current;
    if (!pending) return { ok: true };
    if (inFlightRef.current) return { ok: false, message: "Ya se está guardando." };

    if (isOffline()) {
      setStatus("offline");
      return { ok: false, offline: true, message: "Sin conexión a internet." };
    }

    inFlightRef.current = true;
    setStatus("saving");
    const result = await saveRef.current(pending.payload);
    inFlightRef.current = false;

    if (result.ok) {
      clearDraftIfSaved(studentId, assignmentId, pending.changedAt);
      setLastSavedAt(Date.now());
      setErrorMessage("");
      if (pendingRef.current === pending) {
        pendingRef.current = null;
        setStatus("saved");
        onSyncedRef.current?.();
      } else {
        // Hubo cambios mientras se guardaba: se envían en la siguiente vuelta.
        setStatus("dirty");
        schedule(autosaveDelayMs);
      }
    } else {
      setStatus(result.offline ? "offline" : "error");
      setErrorMessage(result.message ?? "");
      schedule(retryDelayMs);
    }
    return result;
  }, [assignmentId, autosaveDelayMs, retryDelayMs, schedule, studentId]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  /** Programa tal como se cargó al abrir: punto de partida para detectar cambios reales. */
  const setBaseline = useCallback((workspaceState: unknown) => {
    if (lastFingerprintRef.current === null) lastFingerprintRef.current = fingerprint(workspaceState);
  }, []);

  /**
   * Registra un cambio: copia local inmediata y guardado en el servidor en unos segundos.
   * Devuelve false si el contenido es igual al último conocido (no es un cambio real).
   */
  const markChanged = useCallback(
    (payload: WorkPayload): boolean => {
      const nextFingerprint = fingerprint(payload.workspaceState);
      if (nextFingerprint === lastFingerprintRef.current) return false;
      lastFingerprintRef.current = nextFingerprint;

      const changedAt = Date.now();
      pendingRef.current = { payload, changedAt };
      writeDraft(studentId, assignmentId, { ...payload, missionId, updatedAt: changedAt });
      setStatus(isOffline() ? "offline" : "dirty");
      schedule(autosaveDelayMs);
      return true;
    },
    [assignmentId, autosaveDelayMs, missionId, schedule, studentId]
  );

  /** Guarda ya (botón "Guardar"). */
  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    return flush();
  }, [flush]);

  /** El trabajo se guardó por otra vía (por ejemplo al enviar la entrega). */
  const markSynced = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
    clearDraftIfSaved(studentId, assignmentId, Date.now());
    setLastSavedAt(Date.now());
    setErrorMessage("");
    setStatus("saved");
  }, [assignmentId, studentId]);

  useEffect(() => {
    // Borrador recuperado al abrir: intentar enviarlo de inmediato.
    if (pendingRef.current) schedule(0);

    const handleOnline = () => {
      if (pendingRef.current) void flushRef.current();
    };
    const handleOffline = () => {
      if (pendingRef.current) setStatus("offline");
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingRef.current || inFlightRef.current) {
        // El navegador muestra su propio aviso de "salir sin guardar".
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [schedule]);

  return { status, lastSavedAt, errorMessage, setBaseline, markChanged, saveNow, markSynced };
}
