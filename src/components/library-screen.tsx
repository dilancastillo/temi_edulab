"use client";

import { FormEvent, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { useDemoStore } from "@/components/auth-store-provider";
import type { Mission } from "@/lib/types";

const categoryFilters = [
  { value: "Todas", label: "Todas" },
  { value: "Fundamentos", label: "Fundamentos" },
  { value: "Logica", label: "Lógica" },
  { value: "Control", label: "Control" },
  { value: "Robotica", label: "Robótica" }
] as const;
const ageFilters = ["Todas", "7-10", "11-14", "15-18"] as const;
type CategoryFilter = (typeof categoryFilters)[number]["value"];

export function LibraryScreen() {
  const { assignMission, assignments, courses, missions } = useDemoStore();
  const [category, setCategory] = useState<CategoryFilter>("Todas");
  const [ageBand, setAgeBand] = useState<(typeof ageFilters)[number]>("Todas");
  const [previewMission, setPreviewMission] = useState<Mission | null>(null);
  const [assignmentMission, setAssignmentMission] = useState<Mission | null>(null);

  const filteredMissions = useMemo(
    () =>
      missions.filter((mission) => {
        const matchesCategory = category === "Todas" || mission.category === category;
        const matchesAge = ageBand === "Todas" || mission.ageBand === ageBand;
        return matchesCategory && matchesAge;
      }),
    [ageBand, category, missions]
  );

  return (
    <div className="page-stack">
      <PageHeader
        description="Selecciona experiencias listas para clase y asignalas a un grupo."
        eyebrow="Biblioteca"
        title="Biblioteca de Misiones"
      />

      <section className="filter-panel" aria-label="Filtros de biblioteca">
        <fieldset>
          <legend>Categoria</legend>
          <div className="segmented-control">
            {categoryFilters.map((option) => (
              <button
                aria-pressed={category === option.value}
                className="segment-button"
                key={option.value}
                onClick={() => setCategory(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="select-field">
          Edad
          <select onChange={(event) => setAgeBand(event.target.value as (typeof ageFilters)[number])} value={ageBand}>
            {ageFilters.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section aria-label="Misiones disponibles" className="mission-grid">
        {filteredMissions.map((mission) => (
          <article className="mission-card" key={mission.id}>
            <div className="mission-card-top">
              <span className={`mission-symbol mission-symbol-category-${mission.category.toLowerCase()}`} aria-hidden="true">
                <img src={`/icon_${mission.category.toLowerCase()}.png`} alt="" />
              </span>
              <span className="age-pill">{mission.ageBand} años</span>
            </div>
            <h2>{mission.title}</h2>
            <p>{mission.summary}</p>
            <div className="mission-card-actions">
              <button className="button button-secondary" onClick={() => setPreviewMission(mission)} type="button">
                Vista previa
              </button>
              <button className="button button-ghost" onClick={() => setAssignmentMission(mission)} type="button">
                Asignar
              </button>
            </div>
          </article>
        ))}
      </section>

      {previewMission ? <MissionPreview mission={previewMission} onAssign={setAssignmentMission} onClose={() => setPreviewMission(null)} /> : null}
      {assignmentMission ? (
        <AssignMissionModal
          courses={courses}
          mission={assignmentMission}
          assignedCourseIds={assignments
            .filter((a) => a.missionId === assignmentMission.id && a.status === "active")
            .map((a) => a.courseId)}
          onClose={() => setAssignmentMission(null)}
          onSubmit={(courseId, instructions) => {
            assignMission({ courseId, missionId: assignmentMission.id, instructions });
            setAssignmentMission(null);
            setPreviewMission(null);
          }}
        />
      ) : null}
    </div>
  );
}

function MissionPreview({
  mission,
  onAssign,
  onClose
}: Readonly<{ mission: Mission; onAssign: (mission: Mission) => void; onClose: () => void }>) {
  return (
    <Modal onClose={onClose} title={`Vista previa: ${mission.title}`}>
      <div className="preview-layout">
        <div className={`preview-art preview-art-${mission.coverTone}`} aria-hidden="true">
          <span>Bloques</span>
          <span>Evento</span>
          <span>Accion</span>
        </div>
        <div className="preview-copy">
          <span className="age-pill">{mission.ageBand} años</span>
          <p className="eyebrow">Sobre la actividad</p>
          <p>{mission.summary}</p>
          <dl className="definition-panel">
            <div>
              <dt>Duración estimada</dt>
              <dd>{mission.durationMinutes} min</dd>
            </div>
            <div>
              <dt>Resultados de aprendizaje</dt>
              <dd>{mission.outcomes.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="modal-actions">
        <button className="button button-ghost" onClick={onClose} type="button">
          Cerrar
        </button>
        <button className="button button-primary" onClick={() => onAssign(mission)} type="button">
          Asignar a clase
        </button>
      </div>
    </Modal>
  );
}

function AssignMissionModal({
  courses,
  mission,
  assignedCourseIds,
  onClose,
  onSubmit
}: Readonly<{
  courses: { id: string; name: string }[];
  mission: Mission;
  assignedCourseIds: string[];
  onClose: () => void;
  onSubmit: (courseId: string, instructions: string) => void;
}>) {
  const availableCourses = courses.filter((c) => !assignedCourseIds.includes(c.id));
  const [courseId, setCourseId] = useState(availableCourses[0]?.id ?? "");
  const [instructions, setInstructions] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(courseId, instructions);
  }

  if (availableCourses.length === 0) {
    return (
      <Modal onClose={onClose} title="Asignar misión">
        <p className="muted">{mission.title}</p>
        <p className="hint-card">Esta misión ya está asignada a todos los cursos disponibles.</p>
        <div className="modal-actions">
          <button className="button button-ghost" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Asignar misión">
      <p className="muted">{mission.title}</p>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field" htmlFor="assignment-course">
          Curso
          <select id="assignment-course" onChange={(event) => setCourseId(event.target.value)} required value={courseId}>
            {courses.map((course) => {
              const alreadyAssigned = assignedCourseIds.includes(course.id);
              return (
                <option key={course.id} value={course.id} disabled={alreadyAssigned}>
                  {course.name}{alreadyAssigned ? " (ya asignada)" : ""}
                </option>
              );
            })}
          </select>
        </label>
        <label className="field" htmlFor="assignment-instructions">
          Instrucciones adicionales
          <textarea
            id="assignment-instructions"
            maxLength={500}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Notas para tus estudiantes"
            rows={6}
            value={instructions}
          />
        </label>
        <div className="modal-actions">
          <button className="button button-ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="button button-primary" type="submit">
            Asignar a clase
          </button>
        </div>
      </form>
    </Modal>
  );
}
