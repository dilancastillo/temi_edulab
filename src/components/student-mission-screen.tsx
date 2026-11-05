"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { ConfirmDialog } from "@/components/modal";
import { useDemoStore } from "@/components/auth-store-provider";
import { SaveStatusIndicator } from "@/components/save-status-indicator";
import { useUnsavedChanges } from "@/components/unsaved-changes-provider";
import { useWorkAutosave } from "@/components/use-work-autosave";
import { evaluateOrderSteps, orderStepsProgram } from "@/lib/mission-program";
import type { Assignment, Mission, Student, StudentWork } from "@/lib/types";
import { isDraftNewer, readDraft } from "@/lib/work-drafts";

export function StudentMissionScreen() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = Array.isArray(params.assignmentId) ? params.assignmentId[0] : params.assignmentId;
  const { assignments, missions, studentSession, studentWorks, students } = useDemoStore();
  const student = students.find((candidate) => candidate.id === studentSession?.studentId);
  const assignment = assignments.find((candidate) => candidate.id === assignmentId && candidate.courseId === student?.courseId);
  const mission = missions.find((candidate) => candidate.id === assignment?.missionId);
  const work = studentWorks.find((candidate) => candidate.assignmentId === assignment?.id && candidate.studentId === student?.id);

  if (!student || !assignment || !mission) {
    return (
      <div className="student-page-stack">
        <section className="empty-state">
          <h1>No encontramos esta misión</h1>
          <p>Vuelve al inicio para abrir una misión activa de tu grupo.</p>
          <Link className="button button-primary" href="/estudiante">
            Ir al inicio
          </Link>
        </section>
      </div>
    );
  }

  return <MissionEditor assignment={assignment} key={assignment.id} mission={mission} student={student} work={work} />;
}

function MissionEditor({
  student,
  assignment,
  mission,
  work,
}: Readonly<{ student: Student; assignment: Assignment; mission: Mission; work?: StudentWork }>) {
  const router = useRouter();
  const { saveStudentWork, submitStudentWork } = useDemoStore();
  const { setUnsavedState } = useUnsavedChanges();

  // Se decide una sola vez al abrir: si hay una copia local más nueva que la del servidor
  // (un guardado que no llegó), se recupera. El editor no se recarga en cada guardado.
  const [initial] = useState(() => {
    const draft = readDraft(student.id, assignment.id);
    return isDraftNewer(draft, work?.updatedAt)
      ? { workspaceState: draft.workspaceState, restoredDraft: draft }
      : { workspaceState: work?.workspaceState, restoredDraft: null };
  });

  const [workspaceState, setWorkspaceState] = useState<unknown>(initial.workspaceState);
  const [sequence, setSequence] = useState<string[]>([]);
  const [notice, setNotice] = useState(
    initial.restoredDraft ? "Recuperamos cambios tuyos que no se habían guardado. Se están enviando al servidor." : ""
  );
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
  // Blockly emite un cambio al cargar el programa; ese primero no es una edición del estudiante.
  const hasLoadedRef = useRef(false);

  const missionSteps = mission.steps ?? orderStepsProgram;
  const evaluation = useMemo(() => evaluateOrderSteps(sequence, missionSteps, workspaceState), [sequence, missionSteps, workspaceState]);
  const isSubmitted = work?.status === "submitted";

  const autosave = useWorkAutosave({
    studentId: student.id,
    assignmentId: assignment.id,
    missionId: assignment.missionId,
    restoredDraft: initial.restoredDraft,
    save: (payload) => saveStudentWork({ studentId: student.id, assignmentId: assignment.id, missionId: assignment.missionId, ...payload }),
    onSynced: () => setUnsavedState(null),
  });

  function handleChange({ sequence: nextSequence, workspaceState: nextState }: { sequence: string[]; workspaceState: unknown }) {
    setSequence(nextSequence);
    setWorkspaceState(nextState);
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      autosave.setBaseline(nextState);
      return;
    }
    // Al cargar, Blockly sigue emitiendo eventos sin cambiar el programa: solo cuenta un contenido distinto.
    const nextEvaluation = evaluateOrderSteps(nextSequence, missionSteps, nextState);
    if (!autosave.markChanged({ workspaceState: nextState, stepIndex: nextEvaluation.completedSteps })) return;
    setNotice("");
    setSubmitError("");
    setUnsavedState(nextState);
  }

  async function submitWork() {
    setIsConfirmingSubmit(false);
    setIsSubmitting(true);
    setSubmitError("");
    const result = await submitStudentWork({
      studentId: student.id,
      assignmentId: assignment.id,
      missionId: assignment.missionId,
      workspaceState,
      stepIndex: evaluation.completedSteps,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(
        result.offline
          ? "No hay conexión: tu entrega NO se envió. Tu trabajo está guardado en este dispositivo; vuelve a pulsar Enviar cuando regrese la conexión."
          : `No se pudo enviar la entrega (${result.message ?? "error del servidor"}). Inténtalo de nuevo.`
      );
      return;
    }

    autosave.markSynced();
    setUnsavedState(null);
    setNotice("Entrega enviada. Tu profesor la verá como pendiente de revisión.");
    router.refresh();
  }

  return (
    <div className="student-page-stack student-page-editor">
      <section className="editor-header-card">
        <div>
          <p className="eyebrow">Misión</p>
          <h1>{mission.title}</h1>
          <p>{mission.summary}</p>
          <p className="muted">Código: {assignment.missionCode}</p>
        </div>
        <div className="editor-actions" style={{ flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="button button-secondary" onClick={() => void autosave.saveNow()} type="button">
              Guardar
            </button>
            <button
              className="button button-primary"
              disabled={!evaluation.isComplete || isSubmitted || isSubmitting}
              onClick={() => setIsConfirmingSubmit(true)}
              type="button"
            >
              {isSubmitted ? "Enviado" : isSubmitting ? "Enviando…" : "Enviar"}
            </button>
          </div>
          <SaveStatusIndicator errorMessage={autosave.errorMessage} lastSavedAt={autosave.lastSavedAt} status={autosave.status} />
        </div>
      </section>

      <section className="mission-editor-layout">
        <aside className="mission-instructions" aria-labelledby="mission-steps-title">
          <h2 id="mission-steps-title">{mission.title}</h2>
          <p>Arrastra los bloques en el orden correcto. Conéctalos debajo de &ldquo;cuando inicia&rdquo;.</p>
          {assignment.instructions ? <p><strong>Instrucciones de tu profesor:</strong> {assignment.instructions}</p> : null}
          <ol className="step-list">
            {missionSteps.map((step, index) => (
              <li className={index < evaluation.completedSteps ? "step-done" : ""} key={`${step.type}-${index}`}>
                <strong>{step.label}</strong>
                <span>{step.helper}</span>
              </li>
            ))}
          </ol>
          <div className={evaluation.isComplete ? "success-message" : "hint-card"} aria-live="polite">
            {evaluation.message}
          </div>
          {submitError ? (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          ) : null}
          {notice ? (
            <p className="success-message" aria-live="polite">
              {notice}
            </p>
          ) : null}
        </aside>
        <BlocklyWorkspace
          allowedCategories={mission.allowedCategories}
          initialState={initial.workspaceState}
          onChange={handleChange}
          readOnly={false}
        />
      </section>

      {isConfirmingSubmit ? (
        <ConfirmDialog
          body={
            <p>
              Antes de enviar, asegúrate de que todo esté completo. Después de confirmar, tu profesor verá la entrega
              como pendiente de revisión.
            </p>
          }
          confirmLabel="Enviar"
          onCancel={() => setIsConfirmingSubmit(false)}
          onConfirm={() => void submitWork()}
          title="¿Listo para enviar?"
        />
      ) : null}
    </div>
  );
}
