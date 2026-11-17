"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AssignmentRow, formatAssignedDate } from "@/components/assignment-row";
import { ConfirmDialog } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/auth-store-provider";
import { FREE_PLAY_ASSIGNMENT_ID } from "@/lib/types";
import type { Assignment } from "@/lib/types";

export function MissionsScreen() {
  const { archiveAssignment, assignments, courses, deleteAssignment, missions, students, studentWorks, deleteFreePlayProgress } = useDemoStore();
  const studentIds = new Set(students.map((student) => student.id));
  const [showArchived, setShowArchived] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [confirmDeleteFreePlay, setConfirmDeleteFreePlay] = useState(false);

  const hasFreePlayProgress = studentWorks.some((w) => w.assignmentId === FREE_PLAY_ASSIGNMENT_ID);

  const visibleAssignments = useMemo(
    () => assignments.filter((assignment) => (showArchived ? assignment.status === "archived" : assignment.status === "active")),
    [assignments, showArchived]
  );

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <div className="action-row">
            <button className="button button-secondary" onClick={() => setShowArchived((value) => !value)} type="button">
              {showArchived ? "Ver activas" : "Ver archivadas"}
            </button>
            <Link className="button button-primary" href="/profesor/biblioteca">
              Nueva misión
            </Link>
          </div>
        }
        description="Administra las misiones asignadas y consulta el material de clase."
        eyebrow="Misiones"
        title={showArchived ? "Misiones archivadas" : "Misiones en curso"}
      />

      {visibleAssignments.length === 0 && !(!showArchived && hasFreePlayProgress) ? (
        <div className="empty-state">
          <h2>No hay misiones para mostrar</h2>
          <p>Asigna una misión desde la biblioteca o cambia el filtro de archivadas.</p>
        </div>
      ) : (
        <section className="assignment-rows" aria-label="Listado de misiones">
          {visibleAssignments.map((assignment) => {
            const mission = missions.find((candidate) => candidate.id === assignment.missionId);
            const course = courses.find((candidate) => candidate.id === assignment.courseId);

            if (!mission || !course) return null;
            const works = studentWorks.filter((w) => w.assignmentId === assignment.id && studentIds.has(w.studentId));

            return (
              <AssignmentRow
                icon={{ src: `/icon_${mission.category.toLowerCase()}.png`, tone: mission.coverTone }}
                iconActions={[
                  ...(assignment.status === "active"
                    ? [{ label: "Archivar", icon: "archive" as const, onClick: () => archiveAssignment(assignment.id) }]
                    : []),
                  { label: "Eliminar", icon: "close" as const, tone: "danger" as const, onClick: () => setAssignmentToDelete(assignment) },
                ]}
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

          {!showArchived && hasFreePlayProgress ? (
            <AssignmentRow
              icon={{ emoji: "🎮", tone: "indigo" }}
              iconActions={[{ label: "Eliminar progreso de juego libre", icon: "close", tone: "danger", onClick: () => setConfirmDeleteFreePlay(true) }]}
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
        </section>
      )}

      {assignmentToDelete ? (
        <ConfirmDialog
          body={
            <p>
              Esta acción eliminará la misión <strong>{assignmentToDelete.missionCode}</strong> permanentemente. Los estudiantes que tengan esta misión asignada perderán el acceso a ella.
            </p>
          }
          confirmLabel="Eliminar misión"
          onCancel={() => setAssignmentToDelete(null)}
          onConfirm={() => {
            deleteAssignment(assignmentToDelete.id);
            setAssignmentToDelete(null);
          }}
          title="Eliminar misión"
          tone="danger"
        />
      ) : null}

      {confirmDeleteFreePlay ? (
        <ConfirmDialog
          body={<p>Se eliminará el progreso de juego libre de todos los estudiantes. Esta acción no se puede deshacer.</p>}
          confirmLabel="Eliminar progreso"
          onCancel={() => setConfirmDeleteFreePlay(false)}
          onConfirm={() => {
            void deleteFreePlayProgress();
            setConfirmDeleteFreePlay(false);
          }}
          title="Eliminar juego libre"
          tone="danger"
        />
      ) : null}
    </div>
  );
}
