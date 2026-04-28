"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/demo-store-provider";
import { classroomGuideMissionId } from "@/lib/mission-constants";
import type { PairingRequest } from "@/lib/types";

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
  const {
    approveClassSession,
    assignments,
    classSessions,
    confirmPairingRequest,
    courses,
    createClassSession,
    missions,
    pairingRequests,
    refreshData,
    robots,
    students
  } = useDemoStore();
  const [busyAssignmentId, setBusyAssignmentId] = useState("");
  const [selectedPairingRequest, setSelectedPairingRequest] = useState<PairingRequest | null>(null);
  const activeAssignments = assignments.filter((assignment) => assignment.status === "active");
  const studentsToReview = students.filter((student) => student.progress === "Revisar").length;
  const gradedStudents = students.filter((student) => student.progress === "Calificado").length;
  const connectedRobots = robots.filter((robot) => robot.connectionState === "CONNECTED").length;
  const visiblePairingRequests = pairingRequests.filter((request) => request.status === "pending" || request.status === "confirmed");

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshData();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [refreshData]);

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
          suggestedStudent,
          isWorkshopMission: mission?.id === classroomGuideMissionId
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
        description="Gestiona tu aula, vincula el Temi y sigue el progreso del taller en tiempo real."
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
          <span className="muted">
            {visiblePairingRequests.length > 0 ? `${visiblePairingRequests.length} solicitud(es) nuevas` : "Sin solicitudes pendientes"}
          </span>
        </div>
        <div className="assignment-list">
          {robots.length === 0 ? (
            <div className="empty-state">
              <h3>No hay robots vinculados</h3>
              <p>Cuando Temi cree un codigo de vinculacion, podras confirmarlo desde este panel.</p>
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
                <p className="muted">Bateria {robot.batteryPercent ?? "--"}% · {robot.statusLabel ?? "Sin estado"}</p>
                <p className="muted">{robot.lastSeenAt ? `Ultima vez activo: ${formatDateTime(robot.lastSeenAt)}` : "Aun no llega heartbeat real."}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-section" aria-labelledby="pairing-title">
        <div className="section-heading">
          <h2 id="pairing-title">Vinculacion del robot</h2>
        </div>
        <div className="assignment-list">
          {visiblePairingRequests.length === 0 ? (
            <div className="empty-state">
              <h3>Todo al dia</h3>
              <p>Cuando el Temi pida vinculacion, apareceran aqui el codigo y el formulario para asignarlo al curso.</p>
            </div>
          ) : null}
          {visiblePairingRequests.map((request) => (
            <article className="assignment-card" key={request.id}>
              <div className="mission-symbol mission-symbol-yellow" aria-hidden="true" />
              <div>
                <h3>{request.proposedName}</h3>
                <p>
                  Codigo <strong>{request.code}</strong>
                  {request.classroomName ? ` · ${request.classroomName}` : ""}
                </p>
                <p className="muted">
                  {request.status === "pending"
                    ? "Esperando confirmacion desde la plataforma."
                    : "Confirmado. El robot debe consumir el token en su siguiente polling."}
                </p>
                <p className="muted">Expira: {formatDateTime(request.expiresAt)}</p>
              </div>
              <div className="assignment-actions">
                <button
                  className="button button-primary"
                  disabled={request.status !== "pending"}
                  onClick={() => setSelectedPairingRequest(request)}
                  type="button"
                >
                  Confirmar robot
                </button>
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
          {assignmentCards.slice(0, 3).map(({ assignment, classSession, course, mission, robot, suggestedStudent, isWorkshopMission }) => {
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
                  {!classSession && robot && !isWorkshopMission ? (
                    <button
                      className="button button-secondary"
                      disabled={busyAssignmentId === assignment.id}
                      onClick={() => void prepareSession(assignment.id, robot.id, suggestedStudent ?? undefined)}
                      type="button"
                    >
                      Preparar en robot
                    </button>
                  ) : null}
                  {isWorkshopMission ? (
                    <Link className="button button-secondary" href={`/profesor/talleres/preparar/${assignment.id}`}>
                      {classSession ? "Abrir taller" : "Preparar taller"}
                    </Link>
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

      {selectedPairingRequest ? (
        <ConfirmPairingModal
          courses={courses}
          onClose={() => setSelectedPairingRequest(null)}
          onSubmit={async (input) => {
            await confirmPairingRequest(selectedPairingRequest.id, input);
            setSelectedPairingRequest(null);
          }}
          pairingRequest={selectedPairingRequest}
        />
      ) : null}
    </div>
  );
}

function ConfirmPairingModal({
  courses,
  onClose,
  onSubmit,
  pairingRequest
}: Readonly<{
  courses: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (input: { assignedName: string; classroomName: string; courseId: string }) => Promise<void>;
  pairingRequest: PairingRequest;
}>) {
  const [assignedName, setAssignedName] = useState(pairingRequest.proposedName);
  const [classroomName, setClassroomName] = useState(pairingRequest.classroomName ?? "");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        assignedName,
        classroomName,
        courseId
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "No pudimos confirmar el robot.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Confirmar vinculacion del robot">
      <form className="form-stack" onSubmit={handleSubmit}>
        <p className="muted">
          Codigo <strong>{pairingRequest.code}</strong>. Al confirmar, Temi recibira su token en el siguiente polling.
        </p>
        <label className="field" htmlFor="pairing-assigned-name">
          Nombre visible del robot
          <input
            id="pairing-assigned-name"
            maxLength={120}
            onChange={(event) => setAssignedName(event.target.value)}
            required
            value={assignedName}
          />
        </label>
        <label className="field" htmlFor="pairing-classroom">
          Aula o espacio
          <input
            id="pairing-classroom"
            maxLength={120}
            onChange={(event) => setClassroomName(event.target.value)}
            required
            value={classroomName}
          />
        </label>
        <label className="field" htmlFor="pairing-course">
          Curso
          <select id="pairing-course" onChange={(event) => setCourseId(event.target.value)} required value={courseId}>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="modal-actions">
          <button className="button button-ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="button button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Confirmando..." : "Confirmar robot"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
