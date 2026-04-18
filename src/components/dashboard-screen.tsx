"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/auth-store-provider";

const ITEMS_PER_PAGE = 3;

export function DashboardScreen() {
  const { assignments, courses, missions, students } = useDemoStore();
  const activeAssignments = assignments.filter((assignment) => assignment.status === "active");
  const studentsToReview = students.filter((student) => student.progress === "Revisar").length;
  const gradedStudents = students.filter((student) => student.progress === "Calificado").length;
  const robotReadiness = Math.round((activeAssignments.length / Math.max(missions.length, 1)) * 100);
  
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
          <p>Preparación de misiones</p>
          <strong>{robotReadiness}%</strong>
        </article>
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
                <div className={`mission-symbol mission-symbol-${mission.coverTone}`} aria-hidden="true" />
                <div>
                  <h3>{mission.title}</h3>
                  <p>
                    {course.name} · Código de misión: <strong>{assignment.missionCode}</strong>
                  </p>
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
