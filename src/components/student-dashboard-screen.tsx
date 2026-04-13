"use client";

import Link from "next/link";
import { useDemoStore } from "@/components/demo-store-provider";

export function StudentDashboardScreen() {
  const { assignments, courses, missions, session, studentWorks, students } = useDemoStore();
  const student = students.find((candidate) => candidate.id === session?.studentId);
  const course = courses.find((candidate) => candidate.id === student?.courseId);
  const availableAssignments = assignments.filter(
    (assignment) => assignment.status === "active" && assignment.courseId === student?.courseId
  );

  return (
    <div className="student-page-stack">
      <section className="student-hero" aria-labelledby="student-home-title">
        <div>
          <p className="eyebrow">Hola, {student?.fullName ?? "estudiante"}</p>
          <h1 id="student-home-title">Construye, prueba y envía tu misión</h1>
          <p>
            Curso {course?.name ?? "demo"} · Usa bloques para resolver retos y deja tu entrega lista para revisión.
          </p>
        </div>
      </section>

      <section aria-labelledby="student-progress-title" className="student-section">
        <div className="section-heading">
          <h2 id="student-progress-title">Misiones en progreso</h2>
        </div>
        <div className="student-mission-row">
          <Link className="student-free-card" href="/estudiante/juego-libre">
            <span aria-hidden="true">+</span>
            <strong>Juego libre</strong>
            <small>Explora bloques sin enviar</small>
          </Link>

          {availableAssignments.map((assignment) => {
            const mission = missions.find((candidate) => candidate.id === assignment.missionId);
            const work = studentWorks.find((candidate) => candidate.assignmentId === assignment.id && candidate.studentId === student?.id);

            if (!mission) return null;

            return (
              <Link className="student-mission-card" href={`/estudiante/misiones/${assignment.id}`} key={assignment.id}>
                <span className={`mission-preview mission-preview-${mission.coverTone}`} aria-hidden="true" />
                <strong>{mission.title}</strong>
                {(() => {
                  const total = mission.steps?.length ?? 5;
                  const current = work?.status === "submitted" ? total : (work?.stepIndex ?? 0);
                  return (
                    <>
                      <small>{work?.status === "submitted" ? "Enviado" : `${current} de ${total} pasos`}</small>
                      <progress aria-label={`Progreso de ${mission.title}`} max={total} value={current} />
                    </>
                  );
                })()}
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="assigned-title" className="student-section">
        <h2 id="assigned-title">Misiones asignadas</h2>
        <div className="assignment-list">
          {availableAssignments.map((assignment) => {
            const mission = missions.find((candidate) => candidate.id === assignment.missionId);
            const work = studentWorks.find((candidate) => candidate.assignmentId === assignment.id && candidate.studentId === student?.id);

            if (!mission) return null;

            return (
              <article className="student-assigned-card" key={assignment.id}>
                <div>
                  <h3>{mission.title}</h3>
                  <p>{mission.summary}</p>
                  <small>Código: {assignment.missionCode}</small>
                </div>
                <Link className="button button-primary" href={`/estudiante/misiones/${assignment.id}`}>
                  {work?.status === "submitted" ? "Ver entrega" : "Continuar"}
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

