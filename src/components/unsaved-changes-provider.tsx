"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Modal } from "@/components/modal";

type UnsavedChangesContextValue = {
  /** Register unsaved state — pass null to clear */
  setUnsavedState: (workspaceState: unknown | null) => void;
  /** Returns true if navigation is allowed (no unsaved changes or user confirmed) */
  requestNavigation: (onConfirm: () => void) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>({
  setUnsavedState: () => {},
  requestNavigation: (onConfirm) => onConfirm(),
});

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}

export function UnsavedChangesProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const unsavedStateRef = useRef<unknown | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const setUnsavedState = useCallback((state: unknown | null) => {
    unsavedStateRef.current = state;
  }, []);

  const requestNavigation = useCallback((onConfirm: () => void) => {
    if (unsavedStateRef.current === null) {
      onConfirm();
    } else {
      setPendingNavigation(() => onConfirm);
    }
  }, []);

  function handleConfirm() {
    unsavedStateRef.current = null;
    const nav = pendingNavigation;
    setPendingNavigation(null);
    nav?.();
  }

  function handleCancel() {
    setPendingNavigation(null);
  }

  // Build sequence summary from workspaceState
  const steps = buildSteps(unsavedStateRef.current);

  return (
    <UnsavedChangesContext.Provider value={{ setUnsavedState, requestNavigation }}>
      {children}
      {pendingNavigation && (
        <Modal onClose={handleCancel} title="¿Salir sin guardar?">
          <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            Tienes cambios sin guardar. Si sales ahora, perderás el progreso desde tu último guardado.
          </p>
          {steps.length > 0 && (
            <>
              <p style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                Cambios actuales:
              </p>
              <ol style={{ listStyle: "none", padding: 0, margin: "0 0 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {steps.map((step, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.75rem", background: "var(--color-surface)", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "0.875rem" }}>
                    <span>{step.icon}</span>
                    <span>{step.label}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="modal-actions">
            <button className="button button-ghost" onClick={handleCancel} type="button">
              Cancelar
            </button>
            <button className="button button-danger-outline" onClick={handleConfirm} type="button">
              Salir sin guardar
            </button>
          </div>
        </Modal>
      )}
    </UnsavedChangesContext.Provider>
  );
}

function buildSteps(workspaceState: unknown): Array<{ icon: string; label: string }> {
  try {
    if (!workspaceState || typeof workspaceState !== "object") return [];
    const ws = workspaceState as Record<string, unknown>;
    const topBlocks = (ws["blocks"] as Record<string, unknown>)?.["blocks"];
    if (!Array.isArray(topBlocks)) return [];

    const result: Array<{ icon: string; label: string }> = [];
    let imgCount = 0;

    function walk(block: unknown): void {
      if (!block || typeof block !== "object") return;
      const b = block as Record<string, unknown>;
      const type = b["type"] as string;
      const fields = (b["fields"] as Record<string, string>) ?? {};

      if (type === "temi_start") result.push({ icon: "🚀", label: "Cuando inicia" });
      else if (type === "temi_move") result.push({ icon: "📍", label: `Ir a: ${fields["LOCATION"] ?? ""}` });
      else if (type === "temi_say") result.push({ icon: "💬", label: `Decir: "${fields["TEXT"] ?? ""}"` });
      else if (type === "temi_show_image") { imgCount++; result.push({ icon: "🖼", label: `Mostrar imagen ${imgCount}` }); }

      const next = (b["next"] as Record<string, unknown>)?.["block"];
      if (next) walk(next);
    }

    for (const block of topBlocks) walk(block);
    return result;
  } catch { return []; }
}
