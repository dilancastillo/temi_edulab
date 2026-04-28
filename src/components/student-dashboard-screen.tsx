"use client";

import Link from "next/link";
import { useDemoStore } from "@/components/demo-store-provider";
import {
  buildClassroomGuideWorkspace,
  evaluateClassroomGuideWorkspace
} from "@/lib/classroom-guide-mission";
import { classroomGuideMissionId } from "@/lib/mission-constants";

export function StudentDashboardScreen() {
  const { assignments, courses, missions, session, studentWorks, students } = useDemoStore();
  const student = students.find((candidate) => candidate.id === session?.studentId);
  const course = courses.find((candidate) => candidate.id === student?.courseId);
  const availableAssignments = assignments.filter(
    (assignment) => assignment.status === "active" && assignment.courseId === student?.courseId
  );
  const featuredWorkshopAssignment = availableAssignments.find((assignment) => assignment.missionId === classroomGuideMissionId);

  return (
    <div className="student-page-stack">
      <section className="student-kid-hero" aria-labelledby="student-home-title">
        <div>
          <p className="eyebrow">Hola, {student?.fullName ?? "estudiante"}</p>
          <h1 id="student-home-title">Vamos a ayudar a Temi a guiar el salon</h1>
          <p>Curso {course?.name ?? "demo"} - Sigue pasos cortos y deja tu recorrido listo para probar.</p>
        </div>
        {featuredWorkshopAssignment ? (
          <FeaturedWorkshopCard assignmentId={featuredWorkshopAssignment.id} />
        ) : (
          <div className="student-hero-progress">
            <strong>{availableAssignments.length}</strong>
            <span>misiones activas</span>
          </div>
        )}
      </section>

      <section aria-labelledby="student-progress-title" className="student-section">
        <div className="section-heading">
          <h2 id="student-progress-title">Tus misiones</h2>
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

            const workshopEvaluation =
              mission.id === classroomGuideMissionId
                ? evaluateClassroomGuideWorkspace(buildClassroomGuideWorkspace(assignment.workshop, work?.workspaceState))
                : null;
            const workshopMode = assignment.workshop?.studentMode ?? "guided";
            const progress =
              mission.id === classroomGuideMissionId
                ? workshopEvaluation?.completedVisibleSteps ?? 0
                : work?.status === "submitted"
                  ? 5
                  : work?.stepIndex ?? 0;
            const total = mission.id === classroomGuideMissionId ? workshopEvaluation?.totalVisibleSteps ?? 5 : 5;

            return (
              <Link className="student-mission-card" href={`/estudiante/misiones/${assignment.id}`} key={assignment.id}>
                <span className={`mission-preview mission-preview-${mission.coverTone}`} aria-hidden="true" />
                <strong>{mission.title}</strong>
                <small>
                  {work?.status === "submitted"
                    ? "Enviado"
                    : mission.id === classroomGuideMissionId
                      ? progress === 0
                        ? workshopMode === "advanced"
                          ? "Empieza a construir con bloques"
                          : "Empieza con tu primer paso"
                        : `${progress} de ${total} ${workshopMode === "advanced" ? "bloques" : "pasos"}`
                      : `${progress} de ${total} pasos`}
                </small>
                <progress aria-label={`Progreso de ${mission.title}`} max={total} value={progress} />
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
                  <small>Codigo: {assignment.missionCode}</small>
                </div>
                <Link className="button button-primary" href={`/estudiante/misiones/${assignment.id}`}>
                  {work?.status === "submitted"
                    ? "Ver entrega"
                    : mission.id === classroomGuideMissionId
                      ? "Empezar"
                      : "Continuar"}
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function FeaturedWorkshopCard({ assignmentId }: Readonly<{ assignmentId: string }>) {
  const { assignments, missions, session, studentWorks } = useDemoStore();
  const assignment = assignments.find((candidate) => candidate.id === assignmentId);
  const mission = missions.find((candidate) => candidate.id === assignment?.missionId);
  const work = studentWorks.find((candidate) => candidate.assignmentId === assignment?.id && candidate.studentId === session?.studentId);

  if (!assignment || !mission) {
    return null;
  }

  const evaluation = evaluateClassroomGuideWorkspace(buildClassroomGuideWorkspace(assignment.workshop, work?.workspaceState));
  const workshopMode = assignment.workshop?.studentMode ?? "guided";

  return (
    <div className="student-hero-progress">
      <strong>
        {evaluation.completedVisibleSteps}/{evaluation.totalVisibleSteps}
      </strong>
      <span>{workshopMode === "advanced" ? "bloques en orden" : "pasos terminados"}</span>
      <Link className="button button-secondary" href={`/estudiante/misiones/${assignment.id}`}>
        {work?.status === "submitted" ? "Ver entrega" : evaluation.completedVisibleSteps === 0 ? "Empezar" : "Seguir"}
      </Link>
    </div>
  );
}
