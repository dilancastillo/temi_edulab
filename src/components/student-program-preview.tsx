"use client";

import { useEffect, useMemo, useState } from "react";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { evaluateOrderSteps } from "@/lib/mission-program";
import type { Mission } from "@/lib/types";

type StudentProgramPreviewProps = {
  studentName: string;
  workspaceState: unknown;
  /** Misión del trabajo; si no hay (juego libre) no se muestra el avance de pasos. */
  mission?: Mission;
  onClose: () => void;
};

/**
 * Vista para el docente: los bloques del estudiante exactamente como los armó
 * (bien o mal), en modo solo lectura, y cuántos pasos de la misión cumple.
 */
export function StudentProgramPreview({ studentName, workspaceState, mission, onClose }: Readonly<StudentProgramPreviewProps>) {
  // Estado fijo: el editor de solo lectura no debe recargarse si la tabla se actualiza.
  const [initial] = useState(() => workspaceState);

  const progress = useMemo(() => {
    if (!mission?.steps?.length) return null;
    return evaluateOrderSteps([], mission.steps, initial);
  }, [mission, initial]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-labelledby="program-preview-title" aria-modal="true" className="solution-editor" role="dialog">
        <header className="solution-editor-header">
          <div>
            <p className="eyebrow">{mission ? mission.title : "Juego libre"}</p>
            <h2 id="program-preview-title">Programa de {studentName}</h2>
            {progress ? (
              <p className="muted">
                <strong>
                  Pasos cumplidos: {progress.completedSteps} de {progress.totalSteps}
                </strong>
                {progress.isComplete ? " · Todos los pasos están en el orden y la posición correctos." : ` · ${progress.message}`}
              </p>
            ) : (
              <p className="muted">Así tiene armados sus bloques. Puedes mover la vista y hacer zoom, pero no editarlos.</p>
            )}
          </div>
          <div className="modal-actions" style={{ flexShrink: 0 }}>
            <button className="button button-ghost" onClick={onClose} type="button">
              Cerrar
            </button>
          </div>
        </header>

        <div className="solution-editor-body solution-editor-body-single">
          <BlocklyWorkspace initialState={initial} onChange={() => {}} readOnly />
        </div>
      </section>
    </div>
  );
}
