"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/demo-store-provider";

function sessionLabel(status: string) {
  switch (status) {
    case "pending_approval":
      return "Pendiente de aprobacion";
    case "ready":
      return "Lista para robot";
    case "running":
      return "En ejecucion";
    case "paused":
      return "En pausa";
    case "safe_mode":
      return "Modo seguro";
    case "error":
      return "Con error";
    case "completed":
      return "Completada";
    default:
      return "Sin sesion";
  }
}

export function DashboardScreen() {
  const { approveClassSession, assignments, classSessions, courses, createClassSession, missions, robots, students } = useDemoStore();
  const [busyAssignmentId, setBusyAssignmentId] = useState("");
  const activeAssignments = assignments.filter((assignment) => assignment.status === "active");
  const studentsToReview = students.filter((student) => student.progress === "Revisar").length;
  const gradedStudents = students.filter((student) => student.progress === "Calificado").length;
  const connectedRobots = robots.filter((robot) => robot.connectionState === "CONNECTED").length;

  const assignmentCards = useMemo(
    () =>
      activeAssignments.map((assignment) => {
        const mission = missions.find((candidate) => candidate.id === assignment.missionId);
        const course = courses.find((candidate) => candidate.id === assignment.courseId);
        const robot = robots.find((candidate) => candidate.courseId === assignment.courseId) ?? robots[0];
        const classSession = classSessions.find(
          (candidate) => candidate.assignmentId === assignment.id && candidate.robotId === robot?.id && candidate.status !== "completed"
        );
        const suggestedStudent =
          students.find(
            (candidate) =>
              candidate.courseId === assignment.courseId &&
              candidate.currentMissionId === assignment.missionId &&
              candidate.progress !== "Calificado"
          )?.fullName ?? null;

        return {
          assignment,
          classSession,
          course,
          mission,
          robot,
          suggestedStudent
        };
      }),
    [activeAssignments, classSessions, courses, missions, robots, students]
  );

  async function prepareSession(assignmentId: string, robotId: string, activeStudentName?: string) {
    setBusyAssignmentId(assignmentId);
    try {
      await createClassSession({ assignmentId, robotId, activeStudentName });
    } finally {
      setBusyAssignmentId("");
    }
  }

  async function approveSession(assignmentId: string, classSessionId: string) {
    setBusyAssignmentId(assignmentId);
    try {
      await approveClassSession(classSessionId);
    } finally {
      setBusyAssignmentId("");
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Gestiona tu aula, prepara al robot y sigue el progreso de tus estudiantes con datos claros."
        eyebrow="Resumen del dia"
        title="Bienvenido, Profesor"
      />

      <section aria-label="Indicadores principales" className="metric-grid">
        <article className="metric-card">
          <span className="metric-icon metric-icon-yellow" aria-hidden="true" />
          <p>Estudiantes por revisar</p>
          <strong>{studentsToReview}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-green" aria-hidden="true" />
          <p>Estudiantes calificados</p>
          <strong>{gradedStudents}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-blue" aria-hidden="true" />
          <p>Robots conectados</p>
          <strong>
            {connectedRobots}/{Math.max(robots.length, 1)}
          </strong>
        </article>
      </section>

      <section className="panel-section" aria-labelledby="robot-status-title">
        <div className="section-heading">
          <h2 id="robot-status-title">Robot del aula</h2>
        </div>
        <div className="assignment-list">
          {robots.length === 0 ? (
            <div className="empty-state">
              <h3>No hay robots vinculados</h3>
              <p>Cuando confirmemos el pairing del Temi desde la web, aparecera aqui junto con su estado.</p>
            </div>
          ) : null}
          {robots.map((robot) => (
            <article className="assignment-card" key={robot.id}>
              <div className="mission-symbol mission-symbol-blue" aria-hidden="true" />
              <div>
                <h3>{robot.displayName}</h3>
                <p>
                  {robot.classroomName ?? "Sin aula"} · {robot.connectionState}
                </p>
                <p className="muted">
                  Bateria {robot.batteryPercent ?? "--"}% · {robot.statusLabel ?? "Sin estado"}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-section" aria-labelledby="active-missions-title">
        <div className="section-heading">
          <h2 id="active-missions-title">Misiones en curso</h2>
          <Link className="text-link" href="/profesor/misiones">
            Ver todas
          </Link>
        </div>
        <div className="assignment-list">
          {assignmentCards.slice(0, 3).map(({ assignment, classSession, course, mission, robot, suggestedStudent }) => {
            if (!mission || !course) return null;

            return (
              <article className="assignment-card" key={assignment.id}>
                <div className={`mission-symbol mission-symbol-${mission.coverTone}`} aria-hidden="true" />
                <div>
                  <h3>{mission.title}</h3>
                  <p>
                    {course.name} · Codigo de mision: <strong>{assignment.missionCode}</strong>
                  </p>
                  <p className="muted">
                    {robot ? `${robot.displayName} · ${sessionLabel(classSession?.status ?? "none")}` : "Sin robot asignado"}
                  </p>
                  {classSession ? (
                    <p className="muted">
                      {classSession.currentStepLabel ?? "Esperando actualizacion"} · {classSession.progressPercent}% de avance
                    </p>
                  ) : null}
                </div>
                <div className="assignment-actions">
                  {!classSession && robot ? (
                    <button
                      className="button button-secondary"
                      disabled={busyAssignmentId === assignment.id}
                      onClick={() => void prepareSession(assignment.id, robot.id, suggestedStudent ?? undefined)}
                      type="button"
                    >
                      Preparar en robot
                    </button>
                  ) : null}
                  {classSession?.status === "pending_approval" ? (
                    <button
                      className="button button-primary"
                      disabled={busyAssignmentId === assignment.id}
                      onClick={() => void approveSession(assignment.id, classSession.id)}
                      type="button"
                    >
                      Aprobar inicio
                    </button>
                  ) : null}
                  <Link className="button button-ghost" href="/profesor/estudiantes">
                    Ver progreso
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
