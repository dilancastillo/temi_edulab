/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { useDemoStore } from "@/components/auth-store-provider";
import { FREE_PLAY_ASSIGNMENT_ID, FREE_PLAY_MISSION_ID } from "@/lib/types";

export function StudentFreePlayScreen() {
  const { saveStudentWork, studentSession, studentWorks } = useDemoStore();

  const existingWork = studentWorks.find(
    (w) => w.studentId === studentSession?.studentId && w.assignmentId === FREE_PLAY_ASSIGNMENT_ID
  );

  const [sequence, setSequence] = useState<string[]>([]);
  const [workspaceState, setWorkspaceState] = useState<unknown>(existingWork?.workspaceState);
  const [notice, setNotice] = useState("");
  const savedWorkspaceRef = useRef<unknown>(existingWork?.workspaceState ?? null);

  function handleSave() {
    if (!studentSession) return;
    saveStudentWork({
      studentId: studentSession.studentId,
      assignmentId: FREE_PLAY_ASSIGNMENT_ID,
      missionId: FREE_PLAY_MISSION_ID,
      workspaceState,
      stepIndex: 0,
    });
    savedWorkspaceRef.current = workspaceState;
    setNotice("Progreso guardado.");
    setTimeout(() => setNotice(""), 2000);
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
          <button className="button button-secondary" onClick={handleSave} type="button">
            Guardar
          </button>
          {notice ? <span className="success-message" aria-live="polite">{notice}</span> : null}
        </div>
      </section>
      <BlocklyWorkspace
        initialState={existingWork?.workspaceState}
        onChange={({ sequence: nextSequence, workspaceState: nextState }) => {
          setSequence(nextSequence);
          setWorkspaceState(nextState);
        }}
        readOnly={false}
      />
    </div>
  );
}
