"use client";

import { useEffect, useMemo, useState } from "react";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { useDemoStore } from "@/components/auth-store-provider";
import { FEEDBACK_MAX_LENGTH, GRADE_MAX_LENGTH } from "@/lib/grading";
import { evaluateOrderSteps } from "@/lib/mission-program";
import type { Mission, StudentWork } from "@/lib/types";

type StudentWorkReviewProps = {
  studentName: string;
  work: StudentWork;
  mission?: Mission;
  onClose: () => void;
};

/**
 * Ventana del docente para revisar y calificar un trabajo: pasos de la misión a la izquierda
 * (cumplidos o pendientes), los bloques del estudiante en solo lectura y, abajo, la nota
 * (texto libre corto) con un comentario opcional.
 */
export function StudentWorkReview({ studentName, work, mission, onClose }: Readonly<StudentWorkReviewProps>) {
  const { gradeStudentWork } = useDemoStore();
  // Estado fijo: el editor de solo lectura no debe recargarse si la tabla se actualiza.
  const [initial] = useState(() => work.workspaceState);
  const [grade, setGrade] = useState(work.grade ?? "");
  const [feedback, setFeedback] = useState(work.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const steps = useMemo(() => mission?.steps ?? [], [mission]);
  const progress = useMemo(() => (steps.length ? evaluateOrderSteps([], steps, initial) : null), [steps, initial]);
  const isGraded = work.status === "graded";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleGrade() {
    const trimmed = grade.trim();
    if (!trimmed) {
      setError("Escribe una calificación.");
      return;
    }
    setSaving(true);
    setError("");
    const result = await gradeStudentWork({ workId: work.id, grade: trimmed, feedback, missionTitle: mission?.title ?? work.missionTitle });
    setSaving(false);
    if (!result.ok) {
      setError(result.offline ? "No hay conexión. La calificación no se guardó." : (result.message ?? "No se pudo guardar la calificación."));
      return;
    }
    setSaved(true);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-labelledby="work-review-title" aria-modal="true" className="solution-editor review-editor" role="dialog">
        <header className="solution-editor-header">
          <div>
            <p className="eyebrow">{mission?.title ?? work.missionTitle ?? "Misión"}</p>
            <h2 id="work-review-title">Revisar a {studentName}</h2>
            <p className="muted">
              {work.status === "submitted"
                ? "Entregó la misión. Revisa los bloques y califica."
                : isGraded
                  ? "Ya está calificada. Puedes corregir la nota o el comentario."
                  : "Todavía no la entrega; puedes calificar lo que lleva guardado."}
            </p>
          </div>
          <div className="modal-actions" style={{ flexShrink: 0 }}>
            <button className="button button-ghost" onClick={onClose} type="button">
              Cerrar
            </button>
          </div>
        </header>

        <div className="solution-editor-body">
          <aside aria-label="Pasos de la misión" className="solution-steps">
            {progress ? (
              <>
                <p className="review-steps-summary">
                  Pasos cumplidos: <strong>{progress.completedSteps} de {progress.totalSteps}</strong>
                </p>
                <ol className="solution-step-list">
                  {steps.map((step, index) => {
                    const done = index < progress.completedSteps;
                    return (
                      <li className={`review-step${done ? " review-step-done" : ""}`} key={`${step.type}-${index}`}>
                        <span className="solution-step-number">{done ? "✓" : index + 1}</span>
                        <span>
                          <strong>{step.label}</strong>
                          <small>{done ? "Cumplido" : "Pendiente"}</small>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <p className="muted">Esta misión no tiene pasos definidos.</p>
            )}
          </aside>

          <div className="review-main">
            <BlocklyWorkspace initialState={initial} onChange={() => {}} readOnly />

            <form
              className="review-grade"
              onSubmit={(event) => {
                event.preventDefault();
                void handleGrade();
              }}
            >
              <label className="field review-grade-value" htmlFor="review-grade">
                Calificación
                <input
                  id="review-grade"
                  maxLength={GRADE_MAX_LENGTH}
                  onChange={(event) => {
                    setGrade(event.target.value);
                    setError("");
                    setSaved(false);
                  }}
                  placeholder="4.5, A, Superior…"
                  type="text"
                  value={grade}
                />
              </label>
              <label className="field review-grade-feedback" htmlFor="review-feedback">
                Comentario (opcional)
                <textarea
                  id="review-feedback"
                  maxLength={FEEDBACK_MAX_LENGTH}
                  onChange={(event) => {
                    setFeedback(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="Lo que hizo bien y lo que puede mejorar"
                  rows={2}
                  value={feedback}
                />
              </label>
              <div className="review-grade-actions">
                <button className="button button-primary" disabled={saving} type="submit">
                  {saving ? "Guardando…" : isGraded || saved ? "Guardar calificación" : "Calificar"}
                </button>
                {error ? <span className="form-error" role="alert">{error}</span> : null}
                {saved && !error ? <span className="success-message" aria-live="polite">Calificación guardada</span> : null}
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
