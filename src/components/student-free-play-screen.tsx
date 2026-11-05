"use client";

import { useRef, useState } from "react";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { useDemoStore } from "@/components/auth-store-provider";
import { SaveStatusIndicator } from "@/components/save-status-indicator";
import { useUnsavedChanges } from "@/components/unsaved-changes-provider";
import { useWorkAutosave } from "@/components/use-work-autosave";
import { FREE_PLAY_ASSIGNMENT_ID, FREE_PLAY_MISSION_ID, type StudentWork } from "@/lib/types";
import { isDraftNewer, readDraft } from "@/lib/work-drafts";

export function StudentFreePlayScreen() {
  const { studentSession, studentWorks } = useDemoStore();
  if (!studentSession) return null;

  const existingWork = studentWorks.find(
    (w) => w.studentId === studentSession.studentId && w.assignmentId === FREE_PLAY_ASSIGNMENT_ID
  );
  return <FreePlayEditor existingWork={existingWork} key={studentSession.studentId} studentId={studentSession.studentId} />;
}

function FreePlayEditor({ studentId, existingWork }: Readonly<{ studentId: string; existingWork?: StudentWork }>) {
  const { saveStudentWork } = useDemoStore();
  const { setUnsavedState } = useUnsavedChanges();

  // Igual que en las misiones: se recupera la copia local si es más nueva que la del servidor.
  const [initial] = useState(() => {
    const draft = readDraft(studentId, FREE_PLAY_ASSIGNMENT_ID);
    return isDraftNewer(draft, existingWork?.updatedAt)
      ? { workspaceState: draft.workspaceState, restoredDraft: draft }
      : { workspaceState: existingWork?.workspaceState, restoredDraft: null };
  });
  const hasLoadedRef = useRef(false);

  const autosave = useWorkAutosave({
    studentId,
    assignmentId: FREE_PLAY_ASSIGNMENT_ID,
    missionId: FREE_PLAY_MISSION_ID,
    restoredDraft: initial.restoredDraft,
    save: (payload) =>
      saveStudentWork({ studentId, assignmentId: FREE_PLAY_ASSIGNMENT_ID, missionId: FREE_PLAY_MISSION_ID, ...payload }),
    onSynced: () => setUnsavedState(null),
  });

  return (
    <div className="student-page-stack student-page-editor">
      <section className="editor-header-card">
        <div>
          <p className="eyebrow">Juego libre</p>
          <h1>Prueba bloques sin enviar</h1>
          <p>Este espacio no afecta tu progreso. Úsalo para experimentar antes de entrar a una misión.</p>
          {initial.restoredDraft ? (
            <p className="success-message">Recuperamos cambios tuyos que no se habían guardado.</p>
          ) : null}
        </div>
        <div className="editor-actions" style={{ flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          <button className="button button-secondary" onClick={() => void autosave.saveNow()} type="button">
            Guardar
          </button>
          <SaveStatusIndicator errorMessage={autosave.errorMessage} lastSavedAt={autosave.lastSavedAt} status={autosave.status} />
        </div>
      </section>
      <BlocklyWorkspace
        initialState={initial.workspaceState}
        onChange={({ workspaceState: nextState }) => {
          // Blockly emite eventos al cargar el programa: el primero fija el punto de partida
          // y después solo cuenta un contenido distinto.
          if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            autosave.setBaseline(nextState);
            return;
          }
          if (autosave.markChanged({ workspaceState: nextState, stepIndex: 0 })) setUnsavedState(nextState);
        }}
        readOnly={false}
      />
    </div>
  );
}
