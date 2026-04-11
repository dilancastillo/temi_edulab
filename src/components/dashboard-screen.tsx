"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/demo-store-provider";

export function DashboardScreen() {
  const { assignments, courses, missions, students } = useDemoStore();
  const activeAssignments = assignments.filter((assignment) => assignment.status === "active");
  const studentsToReview = students.filter((student) => student.progress === "Revisar").length;
  const gradedStudents = students.filter((student) => student.progress === "Calificado").length;
  const robotReadiness = Math.round((activeAssignments.length / Math.max(missions.length, 1)) * 100);

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
          {activeAssignments.slice(0, 3).map((assignment) => {
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
                  <Link className="button button-secondary" href={`/profesor/estudiantes?mision=${assignment.missionId}`}>
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
      </section>
    </div>
  );
}
