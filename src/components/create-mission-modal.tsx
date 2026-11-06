"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/modal";
import { useDemoStore } from "@/components/auth-store-provider";
import { MissionSolutionEditor } from "@/components/mission-solution-editor";
import { isBaseMission } from "@/lib/base-missions";
import type { MissionCategory, MissionAgeBand, Mission, MissionStep } from "@/lib/types";
import { blockName, extractProgram, textsFromSteps, workspaceFromSteps, type StepTexts } from "@/lib/mission-steps";

/** Solución vacía para una misión nueva: solo el bloque "cuando inicia". */
const EMPTY_SOLUTION = { blocks: { languageVersion: 0, blocks: [{ type: "temi_start", id: "start", x: 40, y: 40 }] } };

type CreateMissionModalProps = {
  onClose: () => void;
  initialMission?: Mission;
  activeAssignmentCount?: number;
};

const CATEGORIES: MissionCategory[] = ["Fundamentos", "Logica", "Control", "Robotica"];
const AGE_BANDS: MissionAgeBand[] = ["7-10", "9-10", "11-14", "15-18"];
const COVER_TONES: Mission["coverTone"][] = ["blue", "green", "yellow", "red", "indigo", "slate"];
const ALLOWED_CATEGORY_OPTIONS: NonNullable<Mission["allowedCategories"]> = [
  "Movimiento",
  "Hablar",
  "Mostrar",
  "Audio",
  "Condición",
  "Control",
];

type FormErrors = {
  title?: string;
  summary?: string;
  duration?: string;
  outcomes?: string;
  steps?: string;
  submit?: string;
};

export function CreateMissionModal({ onClose, initialMission, activeAssignmentCount = 0 }: Readonly<CreateMissionModalProps>) {
  const { createMission, editMission } = useDemoStore();
  const isEditing = !!initialMission;

  // Basic fields
  const [title, setTitle] = useState(initialMission?.title ?? "");
  const [summary, setSummary] = useState(initialMission?.summary ?? "");
  const [category, setCategory] = useState<MissionCategory>(initialMission?.category ?? "Fundamentos");
  const [ageBand, setAgeBand] = useState<MissionAgeBand>(initialMission?.ageBand ?? "7-10");
  const [duration, setDuration] = useState<number>(initialMission?.durationMinutes ?? 30);
  const [coverTone, setCoverTone] = useState<Mission["coverTone"]>(initialMission?.coverTone ?? "blue");

  // Outcomes
  const [outcomes, setOutcomes] = useState<string[]>(initialMission?.outcomes?.length ? initialMission.outcomes : [""]);

  // Steps: salen de la solución en bloques que arma el docente
  const [steps, setSteps] = useState<MissionStep[]>(initialMission?.steps ?? []);
  const [solutionWorkspace, setSolutionWorkspace] = useState<unknown>(initialMission?.solutionWorkspace);
  const [stepsEditor, setStepsEditor] = useState<{ workspace: unknown; texts: StepTexts } | null>(null);

  // Allowed categories
  const [allowedCategories, setAllowedCategories] = useState<NonNullable<Mission["allowedCategories"]>>(
    initialMission?.allowedCategories?.length ? initialMission.allowedCategories : [...ALLOWED_CATEGORY_OPTIONS]
  );

  // Errors
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Outcomes handlers ──────────────────────────────────────────────────────

  function addOutcome() {
    setOutcomes((prev) => [...prev, ""]);
  }

  function removeOutcome(index: number) {
    if (outcomes.length <= 1) return;
    setOutcomes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOutcome(index: number, value: string) {
    setOutcomes((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  // ── Steps editor ───────────────────────────────────────────────────────────

  function openStepsEditor() {
    // Misiones creadas antes del editor de bloques no tienen solución guardada:
    // se arma a partir de sus pasos para poder editarlas igual.
    const workspace = solutionWorkspace ?? (steps.length > 0 ? workspaceFromSteps(steps) : EMPTY_SOLUTION);
    setStepsEditor({ workspace, texts: textsFromSteps(extractProgram(workspace), steps) });
  }

  // ── AllowedCategories handlers ─────────────────────────────────────────────

  function toggleAllowedCategory(cat: NonNullable<Mission["allowedCategories"]>[number]) {
    setAllowedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (!title.trim()) {
      errs.title = "El título es requerido.";
    }
    if (!summary.trim()) {
      errs.summary = "El resumen es requerido.";
    }
    if (duration <= 0) {
      errs.duration = "La duración debe ser mayor a 0.";
    }
    if (outcomes.some((o) => !o.trim())) {
      errs.outcomes = "Todos los resultados deben tener texto.";
    }
    if (steps.length < 2) {
      errs.steps = "Arma los pasos del programa con bloques: \"cuando inicia\" y al menos un bloque más.";
    }

    return errs;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});

    if (isEditing && initialMission) {
      const result = await editMission({
        ...initialMission,
        title: title.trim(),
        summary: summary.trim(),
        category,
        ageBand,
        durationMinutes: duration,
        outcomes,
        steps,
        solutionWorkspace,
        allowedCategories,
        coverTone,
      });
      if (result.ok) {
        onClose();
      } else {
        setErrors({ submit: result.message ?? "Error al actualizar la misión." });
      }
      return;
    }

    const result = await createMission({
      title: title.trim(),
      summary: summary.trim(),
      category,
      ageBand,
      durationMinutes: duration,
      outcomes,
      steps,
      solutionWorkspace,
      allowedCategories,
      coverTone,
    });

    if (result.ok) {
      onClose();
    } else {
      setErrors({ submit: result.message ?? "Error al guardar la misión." });
    }
  }

  return (
    <>
    {/* Mientras se editan los pasos, Escape no debe cerrar la misión y perder lo armado. */}
    <Modal onClose={stepsEditor ? () => {} : onClose} title={isEditing ? "Editar misión" : "Crear misión"}>
      <form className="form-stack" onSubmit={handleSubmit} noValidate>

        {/* ── Advertencia de asignaciones activas ── */}
        {isEditing && activeAssignmentCount > 0 ? (
          <p className="hint-card">
            Esta misión está asignada a {activeAssignmentCount} curso{activeAssignmentCount > 1 ? "s" : ""}. Los cambios afectarán a los estudiantes que aún no han enviado su trabajo.
          </p>
        ) : null}

        {isEditing && initialMission && isBaseMission(initialMission.id) ? (
          <p className="hint-card">
            Es una misión de la biblioteca. Tus cambios solo los verán tú y tus estudiantes, y puedes volver a la versión original con «Restaurar original» en la vista previa.
          </p>
        ) : null}

        {/* ── Título ── */}
        <div className="field">
          <label htmlFor="cm-title">Título</label>
          <input
            id="cm-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-describedby={errors.title ? "cm-title-error" : undefined}
          />
          {errors.title ? (
            <span id="cm-title-error" className="field-error">
              {errors.title}
            </span>
          ) : null}
        </div>

        {/* ── Resumen ── */}
        <div className="field">
          <label htmlFor="cm-summary">Resumen</label>
          <textarea
            id="cm-summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            aria-describedby={errors.summary ? "cm-summary-error" : undefined}
          />
          {errors.summary ? (
            <span id="cm-summary-error" className="field-error">
              {errors.summary}
            </span>
          ) : null}
        </div>

        {/* ── Categoría ── */}
        <div className="field">
          <label htmlFor="cm-category">Categoría</label>
          <select
            id="cm-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as MissionCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* ── Rango de edad ── */}
        <div className="field">
          <label htmlFor="cm-age-band">Rango de edad</label>
          <select
            id="cm-age-band"
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value as MissionAgeBand)}
          >
            {AGE_BANDS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* ── Duración ── */}
        <div className="field">
          <label htmlFor="cm-duration">Duración (minutos)</label>
          <input
            id="cm-duration"
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            aria-describedby={errors.duration ? "cm-duration-error" : undefined}
          />
          {errors.duration ? (
            <span id="cm-duration-error" className="field-error">
              {errors.duration}
            </span>
          ) : null}
        </div>

        {/* ── Tono de portada ── */}
        <div className="field">
          <label htmlFor="cm-cover-tone">Tono de portada</label>
          <select
            id="cm-cover-tone"
            value={coverTone}
            onChange={(e) => setCoverTone(e.target.value as Mission["coverTone"])}
          >
            {COVER_TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* ── Outcomes ── */}
        <section aria-label="Resultados de aprendizaje">
          <p className="eyebrow">Resultados de aprendizaje</p>
          {outcomes.map((outcome, index) => (
            <div className="field" key={index}>
              <label htmlFor={`cm-outcome-${index}`}>Resultado {index + 1}</label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <input
                  id={`cm-outcome-${index}`}
                  type="text"
                  value={outcome}
                  onChange={(e) => updateOutcome(index, e.target.value)}
                  aria-describedby={errors.outcomes ? "cm-outcomes-error" : undefined}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => removeOutcome(index)}
                  disabled={outcomes.length <= 1}
                  aria-label={`Eliminar resultado ${index + 1}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {errors.outcomes ? (
            <span id="cm-outcomes-error" className="field-error">
              {errors.outcomes}
            </span>
          ) : null}
          <button type="button" className="button button-secondary" onClick={addOutcome} style={{ marginTop: "0.5rem" }}>
            Agregar resultado
          </button>
        </section>

        {/* ── Steps ── */}
        <section aria-label="Pasos del programa">
          <p className="eyebrow">Pasos del programa</p>
          <p className="muted" style={{ margin: "0.25rem 0 0.75rem" }}>
            Arma con bloques la solución correcta. Cada bloque es un paso que el estudiante debe armar en el mismo orden y posición.
          </p>
          {steps.length > 0 ? (
            <ol className="solution-step-list" style={{ marginBottom: "0.75rem" }}>
              {steps.map((step, index) => (
                <li key={`${step.type}-${index}`}>
                  <span className="solution-step-button" style={{ cursor: "default" }}>
                    <span className="solution-step-number">{index + 1}</span>
                    <span>
                      <strong>{step.label}</strong>
                      <small>{blockName(step.type)}{step.parentType ? ` · dentro de "${blockName(step.parentType)}"` : ""}</small>
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
          {errors.steps ? (
            <span id="cm-steps-error" className="field-error">
              {errors.steps}
            </span>
          ) : null}
          <button type="button" className="button button-secondary" onClick={openStepsEditor} style={{ marginTop: "0.5rem" }}>
            {steps.length > 0 ? "Editar pasos con bloques" : "Armar pasos con bloques"}
          </button>
        </section>
        {/* ── Allowed categories ── */}
        <fieldset>
          <legend>Bloques disponibles</legend>
          {ALLOWED_CATEGORY_OPTIONS.map((cat) => (
            <label key={cat} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={allowedCategories.includes(cat)}
                onChange={() => toggleAllowedCategory(cat)}
              />
              {cat}
            </label>
          ))}
        </fieldset>

        {/* ── Submit error ── */}
        {errors.submit ? (
          <p className="hint-card">{errors.submit}</p>
        ) : null}

        {/* ── Actions ── */}
        <div className="modal-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button button-primary">
            {isEditing ? "Guardar cambios" : "Crear misión"}
          </button>
        </div>
      </form>
    </Modal>
    {stepsEditor ? (
      <MissionSolutionEditor
        initialTexts={stepsEditor.texts}
        initialWorkspace={stepsEditor.workspace}
        onCancel={() => setStepsEditor(null)}
        onSave={(result) => {
          setSolutionWorkspace(result.solutionWorkspace);
          setSteps(result.steps);
          setErrors((current) => ({ ...current, steps: undefined }));
          setStepsEditor(null);
        }}
      />
    ) : null}
    </>
  );
}
