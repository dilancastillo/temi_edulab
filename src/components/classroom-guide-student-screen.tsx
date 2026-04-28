"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClassroomGuideBlockly } from "@/components/classroom-guide-blockly";
import { ConfirmDialog } from "@/components/modal";
import { useDemoStore } from "@/components/demo-store-provider";
import {
  applyAdvancedChange,
  buildClassroomGuideWorkspace,
  classroomGuideAdvancedSteps,
  classroomGuideChallenges,
  completeCheckpoint,
  completeFarewell,
  completeGreeting,
  createCheckpointIdeas,
  createFarewellIdeas,
  createGreetingIdeas,
  evaluateClassroomGuideWorkspace,
  getClassroomGuideLocationOptions,
  setFarewellText,
  setGreetingText,
  updateCheckpointMessage,
  type ClassroomGuideCheckpointState,
  type ClassroomGuideMode,
  type ClassroomGuideWorkspace
} from "@/lib/classroom-guide-mission";
import type { Assignment, Student, StudentWork } from "@/lib/types";

type Props = {
  assignment: Assignment;
  student: Student;
  work?: StudentWork;
};

type GuidedStage = 0 | 1 | 2 | 3 | 4 | 5;

export function ClassroomGuideStudentScreen({ assignment, student, work }: Readonly<Props>) {
  const router = useRouter();
  const { saveStudentWork, submitStudentWork } = useDemoStore();
  const [workspace, setWorkspace] = useState<ClassroomGuideWorkspace>(() =>
    buildClassroomGuideWorkspace(assignment.workshop, work?.workspaceState)
  );
  const [activeStage, setActiveStage] = useState<GuidedStage>(() =>
    resolveGuidedStage(buildClassroomGuideWorkspace(assignment.workshop, work?.workspaceState))
  );
  const [notice, setNotice] = useState("");
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);

  const evaluation = useMemo(() => evaluateClassroomGuideWorkspace(workspace), [workspace]);
  const isSubmitted = work?.status === "submitted";
  const mode: ClassroomGuideMode = assignment.workshop?.studentMode ?? workspace.mode;
  const routeLabels = workspace.checkpoints.map((checkpoint) => checkpoint.alias);
  const locationOptions = getClassroomGuideLocationOptions(workspace);

  function updateWorkspace(nextWorkspace: ClassroomGuideWorkspace) {
    setWorkspace(nextWorkspace);
    setNotice("");
  }

  async function handleSave() {
    await saveStudentWork({
      studentId: student.id,
      assignmentId: assignment.id,
      missionId: assignment.missionId,
      workspaceState: workspace,
      stepIndex: evaluation.completedVisibleSteps
    });
    setNotice("Tu avance quedo guardado.");
  }

  async function handleSubmit() {
    await submitStudentWork({
      studentId: student.id,
      assignmentId: assignment.id,
      missionId: assignment.missionId,
      workspaceState: workspace,
      stepIndex: evaluation.completedVisibleSteps
    });
    setIsConfirmingSubmit(false);
    setNotice("Listo. Tu mision ya quedo enviada.");
    router.refresh();
  }

  if (isSubmitted) {
    return (
      <div className="student-page-stack">
        <section className="student-kid-hero celebration-card">
          <div>
            <p className="eyebrow">Mision enviada</p>
            <h1>Lo lograste</h1>
            <p>Temi ya tiene tu recorrido. Ahora tu profe podra revisarlo y probarlo con el grupo.</p>
          </div>
          <div className="celebration-stars" aria-hidden="true">
            <span>*</span>
            <span>*</span>
            <span>*</span>
          </div>
        </section>

        <section className="student-summary-card">
          <h2>Tu recorrido final</h2>
          <ul className="kid-summary-list">
            <li>{workspace.greeting.text}</li>
            {workspace.checkpoints.map((checkpoint) => (
              <li key={`${checkpoint.locationName}-${checkpoint.alias}`}>
                {checkpoint.alias}: {checkpoint.studentMessage}
              </li>
            ))}
            <li>{workspace.farewell.text}</li>
          </ul>
          <Link className="button button-primary" href="/estudiante">
            Volver al inicio
          </Link>
        </section>
      </div>
    );
  }

  if (mode === "advanced") {
    return (
      <div className="student-page-stack">
        <section className="student-kid-hero" aria-labelledby="guide-mission-title">
          <div>
            <p className="eyebrow">Hola, {student.fullName}</p>
            <h1 id="guide-mission-title">Hoy Temi sera el guia del salon</h1>
            <p>Tu profe eligio modo avanzado. Aqui construyes todo el recorrido desde bloques con textos y lugares.</p>
          </div>
          <div className="student-hero-progress">
            <strong>
              {evaluation.completedVisibleSteps} de {evaluation.totalVisibleSteps}
            </strong>
            <span>bloques en orden</span>
            <button className="button button-secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} type="button">
              Seguir
            </button>
          </div>
        </section>

        <section className="kid-route-strip">
          <span className="kid-route-pill">Inicio</span>
          {routeLabels.map((label, index) => (
            <span className="kid-route-pill" key={`${label}-${index}`}>
              {label}
            </span>
          ))}
          <span className="kid-route-pill">Vuelve</span>
        </section>

        {notice ? <p className="success-message">{notice}</p> : null}

        <AdvancedEditorCard
          evaluation={evaluation}
          locationOptions={locationOptions}
          onChangeWorkspace={updateWorkspace}
          onSave={() => void handleSave()}
          onSubmit={() => setIsConfirmingSubmit(true)}
          workspace={workspace}
        />

        {isConfirmingSubmit ? (
          <ConfirmDialog
            body={<p>Si tus bloques ya estan listos, podemos enviar tu mision para que el profe la revise.</p>}
            confirmLabel="Enviar mi mision"
            onCancel={() => setIsConfirmingSubmit(false)}
            onConfirm={() => void handleSubmit()}
            title="Enviar mi mision"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="student-page-stack">
      <section className="student-kid-hero" aria-labelledby="guide-mission-title">
        <div>
          <p className="eyebrow">Hola, {student.fullName}</p>
          <h1 id="guide-mission-title">Hoy Temi sera el guia del salon</h1>
          <p>Tu profe eligio modo guiado. Haz 5 pasos sencillos. En cada paso eliges o escribes una idea para Temi.</p>
        </div>
        <div className="student-hero-progress">
          <strong>
            {evaluation.completedVisibleSteps} de {evaluation.totalVisibleSteps}
          </strong>
          <span>pasos terminados</span>
          <button className="button button-secondary" onClick={() => setActiveStage(resolveGuidedStage(workspace))} type="button">
            {evaluation.completedVisibleSteps === 0 ? "Empezar" : "Seguir"}
          </button>
        </div>
      </section>

      <section className="kid-route-strip">
        <span className="kid-route-pill">Inicio</span>
        {routeLabels.map((label, index) => (
          <span className="kid-route-pill" key={`${label}-${index}`}>
            {label}
          </span>
        ))}
        <span className="kid-route-pill">Vuelve</span>
      </section>

      <section className="kid-progress-track" aria-label="Progreso de la mision">
        {classroomGuideChallenges.map((challenge, index) => (
          <button
            aria-current={activeStage === index}
            className={`kid-progress-bubble ${index < evaluation.completedVisibleSteps ? "kid-progress-bubble-done" : ""}`}
            disabled={index > evaluation.completedVisibleSteps}
            key={challenge.key}
            onClick={() => setActiveStage(index as GuidedStage)}
            type="button"
          >
            <span>{index + 1}</span>
            <strong>{challenge.title}</strong>
          </button>
        ))}
        <button
          aria-current={activeStage === 5}
          className={`kid-progress-bubble kid-progress-review ${evaluation.isReadyToSubmit ? "kid-progress-bubble-done" : ""}`}
          disabled={!evaluation.isReadyToSubmit}
          onClick={() => setActiveStage(5)}
          type="button"
        >
          <span>OK</span>
          <strong>Revisar</strong>
        </button>
      </section>

      {notice ? <p className="success-message">{notice}</p> : null}

      {activeStage < 5 ? (
        <GuidedStepCard
          onChangeWorkspace={updateWorkspace}
          onNext={() => setActiveStage((current) => (current < 5 ? ((current + 1) as GuidedStage) : current))}
          onPrevious={() => setActiveStage((current) => (current > 0 ? ((current - 1) as GuidedStage) : current))}
          stepIndex={activeStage as Exclude<GuidedStage, 5>}
          workspace={workspace}
        />
      ) : (
        <GuidedReviewCard
          evaluation={evaluation}
          onPrevious={() => setActiveStage(4)}
          onSave={() => void handleSave()}
          onSubmit={() => setIsConfirmingSubmit(true)}
          workspace={workspace}
        />
      )}

      {isConfirmingSubmit ? (
        <ConfirmDialog
          body={<p>Si ya terminaste tus 5 pasos, podemos enviar tu mision para que el profe la revise.</p>}
          confirmLabel="Enviar mi mision"
          onCancel={() => setIsConfirmingSubmit(false)}
          onConfirm={() => void handleSubmit()}
          title="Enviar mi mision"
        />
      ) : null}
    </div>
  );
}

function GuidedStepCard({
  onChangeWorkspace,
  onNext,
  onPrevious,
  stepIndex,
  workspace
}: Readonly<{
  onChangeWorkspace: (nextWorkspace: ClassroomGuideWorkspace) => void;
  onNext: () => void;
  onPrevious: () => void;
  stepIndex: 0 | 1 | 2 | 3 | 4;
  workspace: ClassroomGuideWorkspace;
}>) {
  const challenge = classroomGuideChallenges[stepIndex];

  if (stepIndex === 0) {
    return (
      <GuidedTextCard
        currentText={workspace.greeting.text}
        helper="Elige una idea o escribe tu propio saludo."
        ideas={createGreetingIdeas()}
        label="Lo que dira Temi al comenzar"
        onComplete={() => {
          const nextWorkspace = completeGreeting(workspace);
          if (!nextWorkspace.greeting.done) {
            return;
          }
          onChangeWorkspace(nextWorkspace);
          onNext();
        }}
        onPrevious={onPrevious}
        onTextChange={(value) => onChangeWorkspace(setGreetingText(workspace, value))}
        stepLabel="Paso 1 de 5"
        title={challenge.title}
      />
    );
  }

  if (stepIndex === 4) {
    return (
      <GuidedTextCard
        currentText={workspace.farewell.text}
        footer={`Temi volvera a: ${toTitleCase(workspace.baseLocationName)}`}
        helper="Elige una despedida y deja listo el regreso al punto base."
        ideas={createFarewellIdeas()}
        label="Lo que dira Temi al final"
        onComplete={() => {
          const nextWorkspace = completeFarewell(workspace);
          if (!nextWorkspace.farewell.done) {
            return;
          }
          onChangeWorkspace(nextWorkspace);
          onNext();
        }}
        onPrevious={onPrevious}
        onTextChange={(value) => onChangeWorkspace(setFarewellText(workspace, value))}
        stepLabel="Paso 5 de 5"
        title={challenge.title}
      />
    );
  }

  const checkpointIndex = stepIndex - 1;
  const checkpoint = workspace.checkpoints[checkpointIndex];

  return (
    <GuidedCheckpointCard
      checkpoint={checkpoint}
      helper={challenge.helper}
      onComplete={() => {
        const nextWorkspace = completeCheckpoint(workspace, checkpointIndex);
        if (!nextWorkspace.checkpoints[checkpointIndex]?.done) {
          return;
        }
        onChangeWorkspace(nextWorkspace);
        onNext();
      }}
      onPrevious={onPrevious}
      onTextChange={(value) => onChangeWorkspace(updateCheckpointMessage(workspace, checkpointIndex, value))}
      stepIndex={checkpointIndex}
      stepLabel={`Paso ${stepIndex + 1} de 5`}
      title={challenge.title}
    />
  );
}

function GuidedTextCard({
  currentText,
  footer,
  helper,
  ideas,
  label,
  onComplete,
  onPrevious,
  onTextChange,
  stepLabel,
  title
}: Readonly<{
  currentText: string;
  footer?: string;
  helper: string;
  ideas: string[];
  label: string;
  onComplete: () => void;
  onPrevious: () => void;
  onTextChange: (value: string) => void;
  stepLabel: string;
  title: string;
}>) {
  const isValid = currentText.trim().length >= 4;

  return (
    <article className="kid-step-card">
      <p className="eyebrow">{stepLabel}</p>
      <h2>{title}</h2>
      <p>{helper}</p>

      <div className="kid-idea-grid">
        {ideas.map((idea) => (
          <button className="kid-idea-card" key={idea} onClick={() => onTextChange(idea)} type="button">
            {idea}
          </button>
        ))}
      </div>

      <label className="field" htmlFor={title}>
        {label}
        <textarea id={title} maxLength={90} onChange={(event) => onTextChange(event.target.value)} placeholder="Escribe aqui" rows={4} value={currentText} />
        <small>{currentText.length}/90 caracteres</small>
      </label>

      {footer ? <p className="hint">{footer}</p> : null}

      <div className="action-row">
        <button className="button button-secondary" disabled={stepLabel === "Paso 1 de 5"} onClick={onPrevious} type="button">
          Atras
        </button>
        <button className="button button-primary" disabled={!isValid} onClick={onComplete} type="button">
          Listo
        </button>
      </div>
    </article>
  );
}

function GuidedCheckpointCard({
  checkpoint,
  helper,
  onComplete,
  onPrevious,
  onTextChange,
  stepIndex,
  stepLabel,
  title
}: Readonly<{
  checkpoint: ClassroomGuideCheckpointState;
  helper: string;
  onComplete: () => void;
  onPrevious: () => void;
  onTextChange: (value: string) => void;
  stepIndex: number;
  stepLabel: string;
  title: string;
}>) {
  const ideas = createCheckpointIdeas(checkpoint, stepIndex);
  const isValid = checkpoint.studentMessage.trim().length >= 4;

  return (
    <article className="kid-step-card">
      <p className="eyebrow">{stepLabel}</p>
      <h2>{title}</h2>
      <p>{helper}</p>

      <div className="kid-location-card kid-location-card-large">
        <div className="kid-location-copy">
          <strong>{checkpoint.alias}</strong>
          <span>{toTitleCase(checkpoint.locationName)}</span>
        </div>
      </div>

      <div className="kid-idea-grid">
        {ideas.map((idea, index) => (
          <button className="kid-idea-card" key={`${checkpoint.alias}-${index}`} onClick={() => onTextChange(idea)} type="button">
            {idea}
          </button>
        ))}
      </div>

      <label className="field" htmlFor={`${checkpoint.alias}-${stepIndex}`}>
        Lo que dira Temi en este lugar
        <textarea
          id={`${checkpoint.alias}-${stepIndex}`}
          maxLength={90}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Escribe aqui"
          rows={4}
          value={checkpoint.studentMessage}
        />
        <small>{checkpoint.studentMessage.length}/90 caracteres</small>
      </label>

      <div className="action-row">
        <button className="button button-secondary" onClick={onPrevious} type="button">
          Atras
        </button>
        <button className="button button-primary" disabled={!isValid} onClick={onComplete} type="button">
          Listo
        </button>
      </div>
    </article>
  );
}

function GuidedReviewCard({
  evaluation,
  onPrevious,
  onSave,
  onSubmit,
  workspace
}: Readonly<{
  evaluation: ReturnType<typeof evaluateClassroomGuideWorkspace>;
  onPrevious: () => void;
  onSave: () => void;
  onSubmit: () => void;
  workspace: ClassroomGuideWorkspace;
}>) {
  return (
    <article className="kid-step-card kid-review-card">
      <p className="eyebrow">Listo para revisar</p>
      <h2>Asi quedo tu recorrido</h2>
      <p>Lee tu recorrido y, si te gusta, guardalo o envialo.</p>

      <ul className="kid-summary-list">
        <li>{workspace.greeting.text}</li>
        {workspace.checkpoints.map((checkpoint) => (
          <li key={`${checkpoint.locationName}-${checkpoint.alias}`}>
            {checkpoint.alias}: {checkpoint.studentMessage}
          </li>
        ))}
        <li>{workspace.farewell.text}</li>
      </ul>

      <div className={evaluation.isReadyToSubmit ? "success-message" : "hint-card"}>
        {evaluation.isReadyToSubmit ? "Tu mision ya esta lista para enviar." : evaluation.message}
      </div>

      <div className="action-row">
        <button className="button button-secondary" onClick={onPrevious} type="button">
          Atras
        </button>
        <button className="button button-secondary" onClick={onSave} type="button">
          Guardar
        </button>
        <button className="button button-primary" disabled={!evaluation.isReadyToSubmit} onClick={onSubmit} type="button">
          Enviar
        </button>
      </div>
    </article>
  );
}

function AdvancedEditorCard({
  evaluation,
  locationOptions,
  onChangeWorkspace,
  onSave,
  onSubmit,
  workspace
}: Readonly<{
  evaluation: ReturnType<typeof evaluateClassroomGuideWorkspace>;
  locationOptions: ReturnType<typeof getClassroomGuideLocationOptions>;
  onChangeWorkspace: (nextWorkspace: ClassroomGuideWorkspace) => void;
  onSave: () => void;
  onSubmit: () => void;
  workspace: ClassroomGuideWorkspace;
}>) {
  return (
    <article className="kid-step-card advanced-editor-card">
      <p className="eyebrow">Modo avanzado</p>
      <h2>Construye el recorrido con bloques</h2>
      <p>Desde los bloques eliges el saludo, el lugar al que Temi va, lo que dira en cada parada y la despedida.</p>
      <div className="hint-card">
        Usa solo estos lugares del taller: {locationOptions.map((option) => option.alias || option.locationName).join(", ")}.
      </div>

      <div className="advanced-instructions-grid">
        <aside className="mission-instructions compact-instructions">
          <h3>Orden del recorrido</h3>
          <ol className="step-list">
            {classroomGuideAdvancedSteps.map((step, index) => (
              <li className={index < evaluation.completedVisibleSteps ? "step-done" : ""} key={`${step.label}-${index}`}>
                <strong>{step.label}</strong>
              </li>
            ))}
          </ol>
          <div className={evaluation.isReadyToSubmit ? "success-message" : "hint-card"}>
            {evaluation.isReadyToSubmit
              ? "Muy bien. Tus bloques y mensajes ya estan listos."
              : evaluation.message}
          </div>
          <div className="kid-summary-mini">
            <strong>Recorrido que llevas</strong>
            <ul className="kid-summary-list">
              <li>{workspace.greeting.text || "Saludo pendiente"}</li>
              {workspace.checkpoints.map((checkpoint, index) => (
                <li key={`${checkpoint.locationName}-${index}`}>
                  {checkpoint.alias || `Lugar ${index + 1}`}: {checkpoint.studentMessage || "Mensaje pendiente"}
                </li>
              ))}
              <li>{workspace.farewell.text || "Despedida pendiente"}</li>
            </ul>
          </div>
        </aside>

        <ClassroomGuideBlockly
          initialState={workspace.advancedWorkspaceState}
          locationOptions={locationOptions}
          onChange={(change) => onChangeWorkspace(applyAdvancedChange(workspace, change))}
        />
      </div>

      <div className="action-row">
        <button className="button button-secondary" onClick={onSave} type="button">
          Guardar
        </button>
        <button className="button button-primary" disabled={!evaluation.isReadyToSubmit} onClick={onSubmit} type="button">
          Enviar
        </button>
      </div>
    </article>
  );
}

function resolveGuidedStage(workspace: ClassroomGuideWorkspace): GuidedStage {
  const evaluation = evaluateClassroomGuideWorkspace(workspace);
  return (evaluation.nextChallengeIndex > 5 ? 5 : evaluation.nextChallengeIndex) as GuidedStage;
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}
