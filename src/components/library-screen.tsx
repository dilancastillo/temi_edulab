"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { useDemoStore } from "@/components/demo-store-provider";
import { classroomGuideMissionId } from "@/lib/mission-constants";
import type { Assignment, Mission } from "@/lib/types";

const categoryFilters = [
  { value: "Todas", label: "Todas" },
  { value: "Fundamentos", label: "Fundamentos" },
  { value: "Logica", label: "Logica" },
  { value: "Control", label: "Control" },
  { value: "Robotica", label: "Robotica" }
] as const;
const ageFilters = ["Todas", "7-10", "11-14", "15-18"] as const;
type CategoryFilter = (typeof categoryFilters)[number]["value"];

export function LibraryScreen() {
  const router = useRouter();
  const { assignments, assignMission, courses, missions } = useDemoStore();
  const [category, setCategory] = useState<CategoryFilter>("Todas");
  const [ageBand, setAgeBand] = useState<(typeof ageFilters)[number]>("Todas");
  const [previewMission, setPreviewMission] = useState<Mission | null>(null);
  const [assignmentMission, setAssignmentMission] = useState<Mission | null>(null);
  const [prepareMission, setPrepareMission] = useState<Mission | null>(null);

  const featuredMission = missions.find((mission) => mission.id === classroomGuideMissionId) ?? null;
  const activeAssignments = assignments.filter((assignment) => assignment.status === "active");
  const filteredMissions = useMemo(
    () =>
      missions.filter((mission) => {
        if (mission.id === classroomGuideMissionId) return false;
        const matchesCategory = category === "Todas" || mission.category === category;
        const matchesAge = ageBand === "Todas" || mission.ageBand === ageBand;
        return matchesCategory && matchesAge;
      }),
    [ageBand, category, missions]
  );

  async function handleAssignMission(courseId: string, instructions: string, missionId: string) {
    await assignMission({ courseId, missionId, instructions });
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Selecciona experiencias listas para clase y deja preparada la sesion del robot."
        eyebrow="Biblioteca"
        title="Biblioteca de Misiones"
      />

      {featuredMission ? (
        <section className="featured-mission-hero" aria-labelledby="featured-mission-title">
          <div className="featured-mission-copy">
            <p className="eyebrow">Mision principal para primaria</p>
            <h2 id="featured-mission-title">{featuredMission.title}</h2>
            <p>{featuredMission.summary}</p>
            <ul className="micro-challenge-list">
              <li>Preparacion guiada del taller</li>
              <li>Configuracion de 3 ubicaciones reales del robot</li>
              <li>Modo normal o demo segura</li>
            </ul>
            <div className="mission-card-actions">
              <button className="button button-secondary" onClick={() => setPreviewMission(featuredMission)} type="button">
                Vista previa
              </button>
              <button className="button button-primary" onClick={() => setPrepareMission(featuredMission)} type="button">
                Preparar taller
              </button>
            </div>
          </div>
          <div className="featured-mission-aside">
            <span className="age-pill">{featuredMission.ageBand} anos</span>
            <dl className="definition-panel">
              <div>
                <dt>Duracion sugerida</dt>
                <dd>{featuredMission.durationMinutes} min</dd>
              </div>
              <div>
                <dt>Aprendizajes</dt>
                <dd>{featuredMission.outcomes.join(", ")}</dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      <section className="filter-panel" aria-label="Filtros de biblioteca">
        <fieldset>
          <legend>Categoria</legend>
          <div className="segmented-control">
            {categoryFilters.map((option) => (
              <button aria-pressed={category === option.value} className="segment-button" key={option.value} onClick={() => setCategory(option.value)} type="button">
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="select-field">
          Edad
          <select onChange={(event) => setAgeBand(event.target.value as (typeof ageFilters)[number])} value={ageBand}>
            {ageFilters.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </section>

      <section aria-label="Misiones disponibles" className="mission-grid">
        {filteredMissions.map((mission) => (
          <article className="mission-card" key={mission.id}>
            <div className="mission-card-top">
              <span className={`mission-symbol mission-symbol-${mission.coverTone}`} aria-hidden="true" />
              <span className="age-pill">{mission.ageBand} anos</span>
            </div>
            <h2>{mission.title}</h2>
            <p>{mission.summary}</p>
            <div className="mission-card-actions">
              <button className="button button-secondary" onClick={() => setPreviewMission(mission)} type="button">Vista previa</button>
              <button className="button button-ghost" onClick={() => setAssignmentMission(mission)} type="button">Asignar</button>
            </div>
          </article>
        ))}
      </section>

      {previewMission ? (
        <MissionPreview
          mission={previewMission}
          onClose={() => setPreviewMission(null)}
          primaryActionLabel={previewMission.id === classroomGuideMissionId ? "Preparar taller" : "Asignar a clase"}
          onPrimaryAction={() => {
            setPreviewMission(null);
            if (previewMission.id === classroomGuideMissionId) {
              setPrepareMission(previewMission);
              return;
            }
            setAssignmentMission(previewMission);
          }}
        />
      ) : null}

      {assignmentMission ? (
        <AssignMissionModal
          courses={courses}
          mission={assignmentMission}
          onClose={() => setAssignmentMission(null)}
          onSubmit={async (courseId, instructions) => {
            await handleAssignMission(courseId, instructions, assignmentMission.id);
            setAssignmentMission(null);
          }}
        />
      ) : null}

      {prepareMission ? (
        <PrepareWorkshopModal
          activeAssignments={activeAssignments}
          courses={courses}
          mission={prepareMission}
          onClose={() => setPrepareMission(null)}
          onSubmit={async (courseId, instructions) => {
            const existingAssignment = activeAssignments.find(
              (assignment) => assignment.missionId === prepareMission.id && assignment.courseId === courseId
            );

            if (existingAssignment) {
              setPrepareMission(null);
              router.push(`/profesor/talleres/preparar/${existingAssignment.id}`);
              return;
            }

            const assignment = await assignMission({
              courseId,
              missionId: prepareMission.id,
              instructions
            });

            setPrepareMission(null);
            router.push(`/profesor/talleres/preparar/${assignment.id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function MissionPreview({
  mission,
  onClose,
  onPrimaryAction,
  primaryActionLabel
}: Readonly<{
  mission: Mission;
  onClose: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
}>) {
  return (
    <Modal onClose={onClose} title={`Vista previa: ${mission.title}`}>
      <div className="preview-layout">
        <div className={`preview-art preview-art-${mission.coverTone}`} aria-hidden="true">
          <span>Bloques</span>
          <span>Robot</span>
          <span>Clase</span>
        </div>
        <div className="preview-copy">
          <span className="age-pill">{mission.ageBand} anos</span>
          <p className="eyebrow">Sobre la actividad</p>
          <p>{mission.summary}</p>
          <dl className="definition-panel">
            <div><dt>Duracion estimada</dt><dd>{mission.durationMinutes} min</dd></div>
            <div><dt>Resultados de aprendizaje</dt><dd>{mission.outcomes.join(", ")}</dd></div>
          </dl>
        </div>
      </div>
      <div className="modal-actions">
        <button className="button button-ghost" onClick={onClose} type="button">Cerrar</button>
        <button className="button button-primary" onClick={onPrimaryAction} type="button">{primaryActionLabel}</button>
      </div>
    </Modal>
  );
}

function AssignMissionModal({
  courses,
  mission,
  onClose,
  onSubmit
}: Readonly<{
  courses: { id: string; name: string }[];
  mission: Mission;
  onClose: () => void;
  onSubmit: (courseId: string, instructions: string) => Promise<void>;
}>) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [instructions, setInstructions] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(courseId, instructions);
  }

  return (
    <Modal onClose={onClose} title="Asignar mision">
      <p className="muted">{mission.title}</p>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field" htmlFor="assignment-course">
          Curso
          <select id="assignment-course" onChange={(event) => setCourseId(event.target.value)} required value={courseId}>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="assignment-instructions">
          Instrucciones adicionales
          <textarea id="assignment-instructions" maxLength={500} onChange={(event) => setInstructions(event.target.value)} placeholder="Notas para tus estudiantes" rows={6} value={instructions} />
        </label>
        <div className="modal-actions">
          <button className="button button-ghost" onClick={onClose} type="button">Cancelar</button>
          <button className="button button-primary" type="submit">Asignar a clase</button>
        </div>
      </form>
    </Modal>
  );
}

function PrepareWorkshopModal({
  activeAssignments,
  courses,
  mission,
  onClose,
  onSubmit
}: Readonly<{
  activeAssignments: Assignment[];
  courses: { id: string; name: string }[];
  mission: Mission;
  onClose: () => void;
  onSubmit: (courseId: string, instructions: string) => Promise<void>;
}>) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [instructions, setInstructions] = useState("");
  const existingAssignment = activeAssignments.find((assignment) => assignment.missionId === mission.id && assignment.courseId === courseId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(courseId, instructions);
  }

  return (
    <Modal onClose={onClose} title="Preparar taller">
      <form className="form-stack" onSubmit={handleSubmit}>
        <p className="muted">Elige el curso que usara esta experiencia con Temi.</p>
        <label className="field" htmlFor="prepare-course">
          Curso
          <select id="prepare-course" onChange={(event) => setCourseId(event.target.value)} required value={courseId}>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
        </label>
        {existingAssignment ? (
          <p className="success-message">Ya existe una asignacion activa para este curso. Abriremos su preparacion actual.</p>
        ) : (
          <label className="field" htmlFor="prepare-instructions">
            Notas opcionales
            <textarea id="prepare-instructions" maxLength={500} onChange={(event) => setInstructions(event.target.value)} placeholder="Observaciones para el taller" rows={5} value={instructions} />
          </label>
        )}
        <div className="modal-actions">
          <button className="button button-ghost" onClick={onClose} type="button">Cancelar</button>
          <button className="button button-primary" type="submit">{existingAssignment ? "Abrir taller" : "Asignar y preparar"}</button>
        </div>
      </form>
    </Modal>
  );
}
