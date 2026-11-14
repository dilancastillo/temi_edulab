"use client";

import Link from "next/link";
import { useDemoStore } from "@/components/auth-store-provider";

export function StudentDashboardScreen() {
  const { assignments, courses, missions, studentSession, studentWorks, students } = useDemoStore();
  const student = students.find((candidate) => candidate.id === studentSession?.studentId);
  const course = courses.find((candidate) => candidate.id === student?.courseId);
  const availableAssignments = assignments.filter(
    (assignment) => assignment.status === "active" && assignment.courseId === student?.courseId
  );
  // Misiones calificadas cuya asignación ya no está activa (el docente la archivó o la borró):
  // el estudiante las sigue viendo con su nota.
  const archivedGraded = studentWorks.filter(
    (work) =>
      work.studentId === student?.id &&
      work.status === "graded" &&
      !availableAssignments.some((assignment) => assignment.id === work.assignmentId)
  );

  return (
    <div className="student-page-stack">
      <section className="student-hero" aria-labelledby="student-home-title">
        <HeroShapes />
        <div className="student-hero-copy">
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
                {(() => {
                  const total = mission.steps?.length ?? 5;
                  const finished = work?.status === "submitted" || work?.status === "graded";
                  const current = finished ? total : (work?.stepIndex ?? 0);
                  return (
                    <>
                      <MissionBanner done={finished} title={mission.title} tone={mission.coverTone} />
                      <small>{work?.status === "graded" ? `Calificada · ${work.grade}` : work?.status === "submitted" ? "Enviado" : `${current} de ${total} pasos`}</small>
                      <progress aria-label={`Progreso de ${mission.title}`} max={total} value={current} />
                    </>
                  );
                })()}
              </Link>
            );
          })}

          {archivedGraded.map((work) => {
            const mission = missions.find((candidate) => candidate.id === work.missionId);
            const title = mission?.title ?? work.missionTitle ?? "Misión";
            return (
              <Link className="student-mission-card" href={`/estudiante/misiones/${work.assignmentId}`} key={work.id}>
                <MissionBanner done title={title} tone={mission?.coverTone ?? "slate"} />
                <small>Calificada · {work.grade}</small>
                <progress aria-label={`Progreso de ${title}`} max={1} value={1} />
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
              <article className={`student-assigned-card tone-surface tone-${mission.coverTone}`} key={assignment.id}>
                <MissionArt done={work?.status === "submitted" || work?.status === "graded"} />
                <div className="student-assigned-copy">
                  <h3>{mission.title}</h3>
                  <p>{mission.summary}</p>
                  <small>{work?.status === "graded" ? `Calificada · ${work.grade}` : `Código: ${assignment.missionCode}`}</small>
                </div>
                <Link
                  aria-label={work?.status === "submitted" || work?.status === "graded" ? `Ver entrega de ${mission.title}` : `Continuar ${mission.title}`}
                  className="student-assigned-action"
                  href={`/estudiante/misiones/${assignment.id}`}
                  title={work?.status === "submitted" || work?.status === "graded" ? "Ver entrega" : "Continuar"}
                >
                  <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// Pieza de rompecabezas (trazo de Lucide, licencia ISC): representa los bloques con los que se programa.
const PUZZLE_PATH =
  "M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z";

/** Decoración de las tarjetas de misión: bloques suaves y una pieza de rompecabezas (con chulo si ya se envió). */
function MissionArt({ done }: Readonly<{ done: boolean }>) {
  return (
    <>
      <svg aria-hidden="true" className="tone-deco" viewBox="0 0 400 130" preserveAspectRatio="xMidYMid slice">
        <g fill="#ffffff">
          <rect height="9" opacity="0.22" rx="2.5" width="18" x="22" y="18" />
          <rect height="6" opacity="0.22" rx="2" width="10" x="44" y="21" />
          <rect height="9" opacity="0.18" rx="2.5" width="18" x="128" y="38" />
          <rect height="9" opacity="0.2" rx="2.5" width="18" x="232" y="14" />
          <rect height="6" opacity="0.2" rx="2" width="10" x="254" y="17" />
        </g>
      </svg>
      <svg aria-hidden="true" className="tone-icon" viewBox="0 0 24 24">
        <path d={PUZZLE_PATH} fill="rgb(255 255 255 / 22%)" stroke="rgb(255 255 255 / 55%)" strokeLinejoin="round" strokeWidth="1" />
        {done ? (
          <path d="m8.5 12.3 2.4 2.4 4.6-4.9" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        ) : null}
      </svg>
    </>
  );
}

/** Portada de la misión con el color que eligió el docente. */
function MissionBanner({ title, tone, done }: Readonly<{ title: string; tone: string; done: boolean }>) {
  return (
    <span className={`mission-banner tone-surface tone-${tone}`}>
      <MissionArt done={done} />
      <strong className="mission-banner-title">{title}</strong>
    </span>
  );
}

/**
 * Figuras de juego del banner de bienvenida: grandes, casi transparentes y cortadas en los bordes.
 * Cada una se aviva y se apaga en bucle a su propio ritmo (ver .hero-shape en globals.css).
 */
function HeroShapes() {
  return (
    <div aria-hidden="true" className="hero-shapes">
      <svg className="hero-shape hero-shape-gamepad" viewBox="0 0 24 24">
        <path
          d="M7 6h10a5 5 0 0 1 4.9 4l1 5.2a3.3 3.3 0 0 1-5.5 2.4L15.5 15h-7l-1.9 2.6a3.3 3.3 0 0 1-5.5-2.4l1-5.2A5 5 0 0 1 7 6zM6.5 9h1v1.5H9v1H7.5V13h-1v-1.5H5v-1h1.5zM15 10.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0zM17 12.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0z"
          fill="#ffffff"
          fillRule="evenodd"
        />
      </svg>
      <svg className="hero-shape hero-shape-puzzle" viewBox="0 0 24 24">
        <path d={PUZZLE_PATH} fill="#ffffff" />
      </svg>
      <svg className="hero-shape hero-shape-robot" viewBox="0 0 24 24">
        <path
          d="M11 2h2v3h-2zM5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM7.5 11a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM13.5 11a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM9 14.5h6V16H9z"
          fill="#ffffff"
          fillRule="evenodd"
        />
      </svg>
      <svg className="hero-shape hero-shape-star" viewBox="0 0 24 24">
        <path d="M12 2.5l2.8 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.2l-6.1 3.6 1.6-6.8-5.2-4.6 6.9-.6z" fill="#ffffff" stroke="#ffffff" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
