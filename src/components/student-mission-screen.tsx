"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { ClassroomGuideStudentScreen } from "@/components/classroom-guide-student-screen";
import { ConfirmDialog } from "@/components/modal";
import { useDemoStore } from "@/components/demo-store-provider";
import { classroomGuideMissionId } from "@/lib/mission-constants";
import { evaluateOrderSteps, orderStepsProgram } from "@/lib/mission-program";

export function StudentMissionScreen() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = Array.isArray(params.assignmentId) ? params.assignmentId[0] : params.assignmentId;
  const { assignments, missions, session, studentWorks, students } = useDemoStore();
  const student = students.find((candidate) => candidate.id === session?.studentId);
  const assignment = assignments.find((candidate) => candidate.id === assignmentId && candidate.courseId === student?.courseId);
  const mission = missions.find((candidate) => candidate.id === assignment?.missionId);
  const work = studentWorks.find((candidate) => candidate.assignmentId === assignment?.id && candidate.studentId === student?.id);

  if (!student || !assignment || !mission) {
    return (
      <div className="student-page-stack">
        <section className="empty-state">
          <h1>No encontramos esta mision</h1>
          <p>Vuelve al inicio para abrir una mision activa de tu grupo.</p>
          <Link className="button button-primary" href="/estudiante">
            Ir al inicio
          </Link>
        </section>
      </div>
    );
  }

  if (mission.id === classroomGuideMissionId) {
    return <ClassroomGuideStudentScreen assignment={assignment} student={student} work={work} />;
  }

  return <LegacyStudentMissionScreen assignmentId={assignmentId} />;
}

function LegacyStudentMissionScreen({ assignmentId }: Readonly<{ assignmentId: string }>) {
  const router = useRouter();
  const { assignments, missions, saveStudentWork, session, studentWorks, students, submitStudentWork } = useDemoStore();
  const student = students.find((candidate) => candidate.id === session?.studentId);
  const assignment = assignments.find((candidate) => candidate.id === assignmentId && candidate.courseId === student?.courseId);
  const mission = missions.find((candidate) => candidate.id === assignment?.missionId);
  const work = studentWorks.find((candidate) => candidate.assignmentId === assignment?.id && candidate.studentId === student?.id);
  const [workspaceState, setWorkspaceState] = useState<unknown>(work?.workspaceState);
  const [sequence, setSequence] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);

  const evaluation = useMemo(() => evaluateOrderSteps(sequence), [sequence]);
  const isSubmitted = work?.status === "submitted";

  if (!student || !assignment || !mission) {
    return null;
  }

  const currentStudent = student;
  const currentAssignment = assignment;
  const currentMission = mission;

  async function saveWork() {
    await saveStudentWork({
      studentId: currentStudent.id,
      assignmentId: currentAssignment.id,
      missionId: currentAssignment.missionId,
      workspaceState,
      stepIndex: evaluation.completedSteps
    });
    setNotice("Progreso guardado en este dispositivo.");
  }

  async function submitWork() {
    await submitStudentWork({
      studentId: currentStudent.id,
      assignmentId: currentAssignment.id,
      missionId: currentAssignment.missionId,
      workspaceState,
      stepIndex: evaluation.completedSteps
    });
    setIsConfirmingSubmit(false);
    setNotice("Entrega enviada. Tu profesor la vera como pendiente de revision.");
    router.refresh();
  }

  return (
    <div className="student-page-stack">
      <section className="editor-header-card">
        <div>
          <p className="eyebrow">Mision</p>
          <h1>{currentMission.title}</h1>
          <p>{currentMission.summary}</p>
          <p className="muted">Codigo: {currentAssignment.missionCode}</p>
        </div>
        <div className="editor-actions">
          <button className="button button-secondary" disabled={isSubmitted} onClick={() => void saveWork()} type="button">
            Guardar
          </button>
          <button className="button button-primary" disabled={!evaluation.isComplete || isSubmitted} onClick={() => setIsConfirmingSubmit(true)} type="button">
            {isSubmitted ? "Enviado" : "Enviar"}
          </button>
        </div>
      </section>

      <section className="mission-editor-layout">
        <aside className="mission-instructions" aria-labelledby="mission-steps-title">
          <h2 id="mission-steps-title">Ordena los pasos</h2>
          <p>Arrastra los bloques en el orden correcto. Conectalos debajo de “cuando inicia”.</p>
          <ol className="step-list">
            {orderStepsProgram.map((step, index) => (
              <li className={index < evaluation.completedSteps ? "step-done" : ""} key={step.type}>
                <strong>{step.label}</strong>
                <span>{step.helper}</span>
              </li>
            ))}
          </ol>
          <div className={evaluation.isComplete ? "success-message" : "hint-card"} aria-live="polite">
            {evaluation.message}
          </div>
          {notice ? <p className="success-message" aria-live="polite">{notice}</p> : null}
        </aside>
        <BlocklyWorkspace
          initialState={work?.workspaceState}
          onChange={({ sequence: nextSequence, workspaceState: nextState }) => {
            setSequence(nextSequence);
            setWorkspaceState(nextState);
            setNotice("");
          }}
          readOnly={isSubmitted}
        />
      </section>

      {isConfirmingSubmit ? (
        <ConfirmDialog
          body={<p>Antes de enviar, asegurate de que todo este completo. Despues de confirmar, tu profesor vera la entrega como pendiente de revision.</p>}
          confirmLabel="Enviar"
          onCancel={() => setIsConfirmingSubmit(false)}
          onConfirm={() => void submitWork()}
          title="Listo para enviar"
        />
      ) : null}
    </div>
  );
}
