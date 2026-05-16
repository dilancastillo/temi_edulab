"use client";

import { useState, useRef } from "react";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { useDemoStore } from "@/components/auth-store-provider";

export const FREE_PLAY_ASSIGNMENT_ID = "free-play";
export const FREE_PLAY_MISSION_ID = "free-play";

export function StudentFreePlayScreen() {
  const { saveStudentWork, studentSession, studentWorks } = useDemoStore();
  const [workspaceState, setWorkspaceState] = useState<unknown>(undefined);
  const [sequence, setSequence] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [unsaved, setUnsaved] = useState(false);
  const savedWorkspaceRef = useRef<unknown>(null);

  const student = studentSession;

  // Cargar progreso guardado si existe
  const savedWork = studentWorks.find(
    (w) => w.assignmentId === FREE_PLAY_ASSIGNMENT_ID && w.studentId === student?.studentId
  );

  const initialState = savedWork?.workspaceState;

  function handleSave() {
    if (!student) return;
    saveStudentWork({
      studentId: student.studentId,
      assignmentId: FREE_PLAY_ASSIGNMENT_ID,
      missionId: FREE_PLAY_MISSION_ID,
      workspaceState,
      stepIndex: 0,
    });
    savedWorkspaceRef.current = workspaceState;
    setUnsaved(false);
    setNotice("Progreso guardado.");
    setTimeout(() => setNotice(""), 3000);
  }

  return (
    <div className="student-page-stack">
      <section className="editor-header-card">
        <div>
          <p className="eyebrow">Juego libre</p>
          <h1>Prueba bloques sin enviar</h1>
          <p>Este espacio no afecta tu progreso. Úsalo para experimentar antes de entrar a una misión.</p>
        </div>
        <div className="editor-actions">
          <button
            className="button button-secondary"
            disabled={!unsaved}
            onClick={handleSave}
            type="button"
          >
            Guardar
          </button>
        </div>
      </section>
      <BlocklyWorkspace
        initialState={initialState}
        onChange={({ sequence: nextSequence, workspaceState: nextState }) => {
          setSequence(nextSequence);
          setWorkspaceState(nextState);
          const isDirty = JSON.stringify(nextState) !== JSON.stringify(savedWorkspaceRef.current);
          setUnsaved(isDirty);
        }}
        readOnly={false}
      />
      {notice ? (
        <p className="success-message" aria-live="polite">{notice}</p>
      ) : null}
    </div>
  );
}
