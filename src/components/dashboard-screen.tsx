"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronSelect } from "@/components/chevron-select";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/auth-store-provider";
import { FREE_PLAY_ASSIGNMENT_ID } from "@/lib/types";

const ITEMS_PER_PAGE = 3;

export function DashboardScreen() {
  const { assignments, courses, missions, students, studentWorks } = useDemoStore();
  const activeAssignments = assignments.filter((assignment) => assignment.status === "active" && missions.some((m) => m.id === assignment.missionId) && courses.some((c) => c.id === assignment.courseId));
  // Los indicadores cuentan trabajos (estudiante + misión), no estudiantes: un estudiante puede
  // tener una misión por revisar y otra calificada. Solo cuentan las asignaciones activas.
  const [metricMissionId, setMetricMissionId] = useState("all");
  const metricMissions = missions.filter((mission) => activeAssignments.some((a) => a.missionId === mission.id));
  const studentIds = new Set(students.map((student) => student.id));
  const worksOf = (assignmentIds: Set<string>) =>
    studentWorks.filter((w) => assignmentIds.has(w.assignmentId) && studentIds.has(w.studentId));
  const metricWorks = worksOf(
    new Set(activeAssignments.filter((a) => metricMissionId === "all" || a.missionId === metricMissionId).map((a) => a.id))
  );
  const studentsToReview = metricWorks.filter((w) => w.status === "submitted").length;
  const gradedStudents = metricWorks.filter((w) => w.status === "graded").length;
  const studentsLink = (progreso: string) => `/profesor/estudiantes?mision=${metricMissionId}&curso=all&progreso=${encodeURIComponent(progreso)}`;

  const hasFreePlayProgress = studentWorks.some((w) => w.assignmentId === FREE_PLAY_ASSIGNMENT_ID);

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(activeAssignments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAssignments = activeAssignments.slice(startIndex, endIndex);

  return (
    <div className="page-stack">
      <PageHeader
        description="Gestiona tu aula y sigue el progreso de tus estudiantes con datos claros."
        eyebrow="Resumen del dia"
        title="Bienvenido, Profesor"
      />

      <section aria-label="Indicadores principales" className="metric-section">
        <div className="metric-filter">
          <label className="toolbar-select" htmlFor="metric-mission">
            <span className="sr-only">Misión de los indicadores</span>
            <ChevronSelect id="metric-mission" onChange={(event) => setMetricMissionId(event.target.value)} value={metricMissionId}>
              <option value="all">Todas las misiones</option>
              {metricMissions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.title}
                </option>
              ))}
            </ChevronSelect>
          </label>
        </div>
        <div className="metric-grid">
          <Link className="metric-card metric-card-link" href={studentsLink("Revisar")}>
            <span className="metric-icon metric-icon-yellow" aria-hidden="true">
              <img src="/ic_revisar.png" alt="" />
            </span>
            <p>Estudiantes por revisar</p>
            <strong>{studentsToReview}</strong>
          </Link>
          <Link className="metric-card metric-card-link" href={studentsLink("Calificado")}>
            <span className="metric-icon metric-icon-green" aria-hidden="true">
              <img src="/ic_revisados.png" alt="" />
            </span>
            <p>Estudiantes calificados</p>
            <strong>{gradedStudents}</strong>
          </Link>
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
          {paginatedAssignments.map((assignment) => {
            const mission = missions.find((candidate) => candidate.id === assignment.missionId);
            const course = courses.find((candidate) => candidate.id === assignment.courseId);

            if (!mission || !course) return null;

            return (
              <article className="assignment-card" key={assignment.id}>
                <span className={`mission-symbol mission-symbol-${mission.coverTone}`} aria-hidden="true">
                  <img src={`/icon_${mission.category.toLowerCase()}.png`} alt="" />
                </span>
                <div>
                  <h3>{mission.title}</h3>
                  <p>
                    {course.name} · Código de misión: <strong>{assignment.missionCode}</strong>
                  </p>
                  {(() => {
                    const works = worksOf(new Set([assignment.id]));
                    const toReview = works.filter((w) => w.status === "submitted").length;
                    const graded = works.filter((w) => w.status === "graded").length;
                    return (
                      <p className="assignment-counts">
                        {toReview} por revisar · {graded} calificados
                      </p>
                    );
                  })()}
                </div>
                <div className="assignment-actions">
                  <Link className="button button-secondary" href={`/profesor/estudiantes?mision=${assignment.missionId}&curso=${assignment.courseId}`}>
                    Ver progreso
                  </Link>
                  <Link className="button button-ghost" href="/profesor/biblioteca">
                    Ver material
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        {hasFreePlayProgress ? (
          <article className="assignment-card" style={{ marginTop: "0.75rem" }}>
            <span className="mission-symbol mission-symbol-indigo" aria-hidden="true">
              <span style={{ fontSize: "1.5rem" }}>🎮</span>
            </span>
            <div>
              <h3>Juego libre</h3>
              <p className="muted">Exploración libre de bloques</p>
            </div>
            <div className="assignment-actions">
              <Link className="button button-secondary" href={`/profesor/estudiantes?mision=free-play&curso=all`}>
                Ver progreso
              </Link>
            </div>
          </article>
        ) : null}
        {totalPages > 1 && (
          <div className="pagination-footer">
            <span className="pagination-info">
              Mostrando {Math.min(endIndex, activeAssignments.length)} de {activeAssignments.length} misiones
            </span>
            <div className="pagination-controls">
              <button
                className="button button-ghost"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                type="button"
              >
                Anterior
              </button>
              <span className="pagination-current">
                {currentPage} / {totalPages}
              </span>
              <button
                className="button button-ghost"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
