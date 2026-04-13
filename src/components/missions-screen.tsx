"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/demo-store-provider";
import type { Assignment } from "@/lib/types";

export function MissionsScreen() {
  const { archiveAssignment, assignments, courses, deleteAssignment, missions } = useDemoStore();
  const [showArchived, setShowArchived] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);

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

      <section className="assignment-list" aria-label="Listado de misiones">
        {visibleAssignments.length === 0 ? (
          <div className="empty-state">
            <h2>No hay misiones para mostrar</h2>
            <p>Asigna una misión desde la biblioteca o cambia el filtro de archivadas.</p>
          </div>
        ) : null}

        {visibleAssignments.map((assignment) => {
          const mission = missions.find((candidate) => candidate.id === assignment.missionId);
          const course = courses.find((candidate) => candidate.id === assignment.courseId);

          if (!mission || !course) return null;

          return (
            <article className="assignment-card assignment-card-wide" key={assignment.id}>
              <div className={`mission-symbol mission-symbol-${mission.coverTone}`} aria-hidden="true" />
              <div>
                <h2>{mission.title}</h2>
                <p>
                  {course.name} · Código de misión: <strong>{assignment.missionCode}</strong>
                </p>
                <p className="muted">
                  {assignment.completedCount} completados · {assignment.reviewCount} por revisar
                </p>
              </div>
              <div className="assignment-actions assignment-actions-right">
                {assignment.status === "active" ? (
                  <button className="button button-primary" onClick={() => void archiveAssignment(assignment.id)} type="button">
                    Archivar
                  </button>
                ) : null}
                <button className="button button-danger-outline" onClick={() => setAssignmentToDelete(assignment)} type="button">
                  Eliminar
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {assignmentToDelete ? (
        <ConfirmDialog
          body={
            <p>
              Esta acción quitará <strong>{assignmentToDelete.missionCode}</strong> del listado demo. En producción se
              conservaría auditoría y entregas históricas.
            </p>
          }
          confirmLabel="Eliminar misión"
          onCancel={() => setAssignmentToDelete(null)}
          onConfirm={async () => {
            await deleteAssignment(assignmentToDelete.id);
            setAssignmentToDelete(null);
          }}
          title="Eliminar misión"
          tone="danger"
        />
      ) : null}
    </div>
  );
}
