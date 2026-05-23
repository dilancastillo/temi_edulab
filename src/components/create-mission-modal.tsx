"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/modal";
import { useDemoStore } from "@/components/auth-store-provider";
import type { MissionCategory, MissionAgeBand, Mission } from "@/lib/types";
import type { ProgramBlockType, ProgramStep } from "@/lib/mission-program";

type CreateMissionModalProps = {
  onClose: () => void;
};

const CATEGORIES: MissionCategory[] = ["Fundamentos", "Logica", "Control", "Robotica"];
const AGE_BANDS: MissionAgeBand[] = ["7-10", "9-10", "11-14", "15-18"];
const COVER_TONES: Mission["coverTone"][] = ["blue", "green", "yellow", "red", "indigo", "slate"];
const BLOCK_TYPES: ProgramBlockType[] = [
  "temi_start",
  "temi_move",
  "temi_say",
  "temi_show",
  "temi_audio",
  "temi_show_image",
  "temi_show_video",
  "temi_condition",
  "temi_while_mqtt",
  "temi_repeat",
  "temi_while_count",
  "temi_while_timer",
  "temi_while_listen",
];
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

export function CreateMissionModal({ onClose }: Readonly<CreateMissionModalProps>) {
  const { createMission } = useDemoStore();

  // Basic fields
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<MissionCategory>("Fundamentos");
  const [ageBand, setAgeBand] = useState<MissionAgeBand>("7-10");
  const [duration, setDuration] = useState<number>(30);
  const [coverTone, setCoverTone] = useState<Mission["coverTone"]>("blue");

  // Outcomes
  const [outcomes, setOutcomes] = useState<string[]>([""]);

  // Steps
  const [steps, setSteps] = useState<ProgramStep[]>([
    { type: "temi_start", label: "", helper: "" },
  ]);

  // Allowed categories
  const [allowedCategories, setAllowedCategories] = useState<NonNullable<Mission["allowedCategories"]>>(
    [...ALLOWED_CATEGORY_OPTIONS]
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

  // ── Steps handlers ─────────────────────────────────────────────────────────

  function addStep() {
    setSteps((prev) => [...prev, { type: "temi_start", label: "", helper: "" }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof ProgramStep, value: string) {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      )
    );
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
    if (steps.some((s) => !s.label.trim() || !s.helper.trim())) {
      errs.steps = "Todos los pasos deben tener etiqueta e instrucción.";
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

    const result = await createMission({
      title: title.trim(),
      summary: summary.trim(),
      category,
      ageBand,
      durationMinutes: duration,
      outcomes,
      steps,
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
    <Modal onClose={onClose} title="Crear misión">
      <form className="form-stack" onSubmit={handleSubmit} noValidate>

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
          {steps.map((step, index) => (
            <div key={index} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="field" style={{ flex: "0 0 auto", minWidth: "10rem" }}>
                <label htmlFor={`cm-step-type-${index}`}>Tipo</label>
                <select
                  id={`cm-step-type-${index}`}
                  value={step.type}
                  onChange={(e) => updateStep(index, "type", e.target.value)}
                >
                  {BLOCK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ flex: 1, minWidth: "8rem" }}>
                <label htmlFor={`cm-step-label-${index}`}>Etiqueta</label>
                <input
                  id={`cm-step-label-${index}`}
                  type="text"
                  value={step.label}
                  onChange={(e) => updateStep(index, "label", e.target.value)}
                  aria-describedby={errors.steps ? "cm-steps-error" : undefined}
                />
              </div>
              <div className="field" style={{ flex: 1, minWidth: "8rem" }}>
                <label htmlFor={`cm-step-helper-${index}`}>Instrucción</label>
                <input
                  id={`cm-step-helper-${index}`}
                  type="text"
                  value={step.helper}
                  onChange={(e) => updateStep(index, "helper", e.target.value)}
                  aria-describedby={errors.steps ? "cm-steps-error" : undefined}
                />
              </div>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => removeStep(index)}
                aria-label={`Eliminar paso ${index + 1}`}
                style={{ marginBottom: "0.25rem" }}
              >
                ×
              </button>
            </div>
          ))}
          {errors.steps ? (
            <span id="cm-steps-error" className="field-error">
              {errors.steps}
            </span>
          ) : null}
          <button type="button" className="button button-secondary" onClick={addStep} style={{ marginTop: "0.5rem" }}>
            Agregar paso
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
            Crear misión
          </button>
        </div>
      </form>
    </Modal>
  );
}
