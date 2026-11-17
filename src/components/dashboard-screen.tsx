"use client";

import Link from "next/link";
import { useState } from "react";
import { AssignmentRow, formatAssignedDate } from "@/components/assignment-row";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/auth-store-provider";
import { FREE_PLAY_ASSIGNMENT_ID } from "@/lib/types";

const ITEMS_PER_PAGE = 3;

export function DashboardScreen() {
  const { assignments, courses, missions, students, studentWorks } = useDemoStore();
  const activeAssignments = assignments.filter((assignment) => assignment.status === "active" && missions.some((m) => m.id === assignment.missionId) && courses.some((c) => c.id === assignment.courseId));
  // Por revisar y calificados de cada misión: se cuentan trabajos de estudiantes que existen.
  const studentIds = new Set(students.map((student) => student.id));
  const worksOf = (assignmentIds: Set<string>) =>
    studentWorks.filter((w) => assignmentIds.has(w.assignmentId) && studentIds.has(w.studentId));

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

      <section className="panel-section" aria-labelledby="active-missions-title">
        <div className="section-heading">
          <h2 id="active-missions-title">Misiones en curso</h2>
          <Link className="text-link" href="/profesor/misiones">
            Ver todas
          </Link>
        </div>
        <div className="assignment-rows">
          {paginatedAssignments.map((assignment) => {
            const mission = missions.find((candidate) => candidate.id === assignment.missionId);
            const course = courses.find((candidate) => candidate.id === assignment.courseId);

            if (!mission || !course) return null;
            const works = worksOf(new Set([assignment.id]));

            return (
              <AssignmentRow
                icon={{ src: `/icon_${mission.category.toLowerCase()}.png`, tone: mission.coverTone }}
                secondary={{ label: "Ver material", href: "/profesor/biblioteca" }}
                key={assignment.id}
                primary={{ label: "Ver progreso", href: `/profesor/estudiantes?mision=${assignment.missionId}&curso=${assignment.courseId}` }}
                stats={[
                  { value: formatAssignedDate(assignment.assignedAt), label: "Asignada" },
                  { value: String(works.filter((w) => w.status === "submitted").length), label: "Por revisar" },
                  { value: String(works.filter((w) => w.status === "graded").length), label: "Calificados" },
                ]}
                subtitle={`${course.name} · Código ${assignment.missionCode}`}
                title={mission.title}
              />
            );
          })}
          {hasFreePlayProgress ? (
            <AssignmentRow
              icon={{ emoji: "🎮", tone: "indigo" }}
              primary={{ label: "Ver progreso", href: "/profesor/estudiantes?mision=free-play&curso=all" }}
              stats={[
                { value: "—", label: "Asignada" },
                { value: String(new Set(studentWorks.filter((w) => w.assignmentId === FREE_PLAY_ASSIGNMENT_ID).map((w) => w.studentId)).size), label: "Estudiantes" },
                { value: "—", label: "Calificados" },
              ]}
              subtitle="Exploración libre de bloques"
              title="Juego libre"
            />
          ) : null}
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
