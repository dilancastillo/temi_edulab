"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { ConfirmDialog } from "@/components/modal";
import { ExecuteButton } from "@/components/execute-button";
import { ImageUploadPanel } from "@/components/image-upload-panel";
import { VideoUploadPanel } from "@/components/video-upload-panel";
import { useDemoStore } from "@/components/demo-store-provider";
import { evaluateOrderSteps, orderStepsProgram } from "@/lib/mission-program";
import { extractFieldFromBlock, extractShowImageBlocks, extractVideoBlocks } from "@/lib/robot-adapter";
import { useUnsavedChanges } from "@/components/unsaved-changes-provider";

export function StudentMissionScreen() {
  const router = useRouter();
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = Array.isArray(params.assignmentId) ? params.assignmentId[0] : params.assignmentId;
  const { assignments, missions, saveStudentWork, session, studentWorks, students, submitStudentWork } = useDemoStore();
  const student = students.find((candidate) => candidate.id === session?.studentId);
  const assignment = assignments.find((candidate) => candidate.id === assignmentId && candidate.courseId === student?.courseId);
  const mission = missions.find((candidate) => candidate.id === assignment?.missionId);
  const work = studentWorks.find((candidate) => candidate.assignmentId === assignment?.id && candidate.studentId === student?.id);
  const [workspaceState, setWorkspaceState] = useState<unknown>(work?.workspaceState);
  const [sequence, setSequence] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
  const updateImageBase64Ref = useRef<((blockId: string, base64: string) => void) | null>(null);
  const updateVideoUrlRef = useRef<((blockId: string, videoUrl: string) => void) | null>(null);
  const { setUnsavedState } = useUnsavedChanges();

  // Track unsaved changes: compare current workspace with last saved
  const savedWorkspaceRef = useRef<unknown>(work?.workspaceState ?? null);

  const missionSteps = mission?.steps ?? orderStepsProgram;
  const evaluation = useMemo(() => evaluateOrderSteps(sequence, missionSteps), [sequence, missionSteps]);
  const isSubmitted = work?.status === "submitted";

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

  function saveWork() {
    if (!student || !assignment) return;
    saveStudentWork({
      studentId: student.id,
      assignmentId: assignment.id,
      missionId: assignment.missionId,
      workspaceState,
      stepIndex: evaluation.completedSteps
    });
    savedWorkspaceRef.current = workspaceState;
    setUnsavedState(null);
    setNotice("Progreso guardado en este dispositivo.");
  }

  function submitWork() {
    if (!student || !assignment) return;
    submitStudentWork({
      studentId: student.id,
      assignmentId: assignment.id,
      missionId: assignment.missionId,
      workspaceState,
      stepIndex: evaluation.completedSteps
    });
    setIsConfirmingSubmit(false);
    setNotice("Entrega enviada. Tu profesor la verá como pendiente de revisión.");
    router.refresh();
  }

  return (
    <div className="student-page-stack">
      <section className="editor-header-card">
        <div>
          <p className="eyebrow">Misión</p>
          <h1>{mission.title}</h1>
          <p>{mission.summary}</p>
          <p className="muted">Código: {assignment.missionCode}</p>
        </div>
        <div className="editor-actions">
          <button className="button button-secondary" disabled={isSubmitted} onClick={saveWork} type="button">
            Guardar
          </button>
          <button
            className="button button-primary"
            disabled={!evaluation.isComplete || isSubmitted}
            onClick={() => setIsConfirmingSubmit(true)}
            type="button"
          >
            {isSubmitted ? "Enviado" : "Enviar"}
          </button>
        </div>
      </section>

      <section className="mission-editor-layout">
        <aside className="mission-instructions" aria-labelledby="mission-steps-title">
          <h2 id="mission-steps-title">{mission.title}</h2>
          <p>Arrastra los bloques en el orden correcto. Conéctalos debajo de “cuando inicia”.</p>
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
          {notice ? (
            <p className="success-message" aria-live="polite">
              {notice}
            </p>
          ) : null}
        </aside>
        <BlocklyWorkspace
          initialState={work?.workspaceState}
          onChange={({ sequence: nextSequence, workspaceState: nextState }) => {
            setSequence(nextSequence);
            setWorkspaceState(nextState);
            setNotice("");
            // Mark as unsaved if different from last save
            const isDirty = JSON.stringify(nextState) !== JSON.stringify(savedWorkspaceRef.current);
            setUnsavedState(isDirty ? nextState : null);
          }}
          readOnly={isSubmitted}
          allowedCategories={mission.allowedCategories}
          onWorkspaceReady={(fnImg, fnVid) => {
            updateImageBase64Ref.current = fnImg;
            updateVideoUrlRef.current = fnVid;
          }}
        />
        {sequence.includes("temi_show_image") && !isSubmitted && (
          extractShowImageBlocks(workspaceState).map(({ id, base64, index }) => (
            <ImageUploadPanel
              key={id}
              label={`Imagen ${index + 1}`}
              currentBase64={base64}
              onImageSelected={(b64) => updateImageBase64Ref.current?.(id, b64)}
            />
          ))
        )}
        {sequence.includes("temi_show_video") && !isSubmitted && (
          extractVideoBlocks(workspaceState).map(({ id, videoUrl, index }) => (
            <VideoUploadPanel
              key={id}
              label={`Video ${index + 1}`}
              currentVideoUrl={videoUrl}
              onVideoUploaded={(url) => updateVideoUrlRef.current?.(id, url)}
            />
          ))
        )}
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
          onConfirm={submitWork}
          title="¿Listo para enviar?"
        />
      ) : null}
    </div>
  );
}

