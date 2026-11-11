"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { useDemoStore } from "@/components/auth-store-provider";
import { evaluateOrderSteps } from "@/lib/mission-program";
import { FREE_PLAY_ASSIGNMENT_ID } from "@/lib/types";

type StudentReportProps = {
  assignmentId: string;
  studentId: string;
};

/** "9 nov 2026, 11:05 a. m." */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const time = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${time}`;
}

/** Nombre de archivo sin tildes ni espacios: "Reporte_Club-Robotica_Camilo-Lopez". */
function fileSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reporte imprimible de la actividad de un estudiante, para que el docente lo guarde como PDF
 * desde el diálogo de impresión del navegador. Se abre en una pestaña aparte desde Estudiantes.
 */
export function StudentReport({ assignmentId, studentId }: Readonly<StudentReportProps>) {
  const router = useRouter();
  const { assignments, courses, isReady, missions, profile, session, students, studentWorks, teacherId } = useDemoStore();
  const [programReady, setProgramReady] = useState(false);
  const printedRef = useRef(false);

  useEffect(() => {
    if (isReady && !session && !teacherId) router.replace("/login");
  }, [isReady, router, session, teacherId]);

  const student = students.find((candidate) => candidate.id === studentId);
  const work = studentWorks.find((candidate) => candidate.studentId === studentId && candidate.assignmentId === assignmentId);
  const course = student ? courses.find((candidate) => candidate.id === student.courseId) : undefined;
  const assignment = assignments.find((candidate) => candidate.id === assignmentId);
  const isFreePlay = assignmentId === FREE_PLAY_ASSIGNMENT_ID;
  const mission = !isFreePlay && assignment ? missions.find((candidate) => candidate.id === assignment.missionId) : undefined;

  // Estado fijo: los bloques no deben recargarse si el docente guarda algo en otra pestaña.
  const [workspaceState] = useState(() => work?.workspaceState);

  const progress = useMemo(() => {
    if (!mission?.steps?.length || workspaceState == null) return null;
    return evaluateOrderSteps([], mission.steps, workspaceState);
  }, [mission, workspaceState]);

  const courseName = course?.name ?? "Sin curso";
  const activityName = isFreePlay ? "Juego libre" : (mission?.title ?? "Actividad");

  // El navegador usa el título de la página como nombre del PDF.
  useEffect(() => {
    if (!student) return;
    const previous = document.title;
    document.title = `Reporte_${fileSlug(courseName)}_${fileSlug(student.fullName)}`;
    return () => {
      document.title = previous;
    };
  }, [courseName, student]);

  // Abre el diálogo de impresión una sola vez, cuando los bloques y la letra ya están dibujados.
  useEffect(() => {
    if (!programReady || printedRef.current) return;
    printedRef.current = true;
    const fonts = typeof document.fonts?.ready?.then === "function" ? document.fonts.ready : Promise.resolve();
    void fonts.then(() => window.setTimeout(() => window.print(), 150));
  }, [programReady]);

  if (!isReady || (!session && !teacherId)) {
    return <p className="report-notice">Cargando el reporte...</p>;
  }

  if (!student || !work) {
    return (
      <main className="report-page">
        <p className="report-notice">No se encontró el trabajo de este estudiante. Cierra esta pestaña y vuelve a abrir el reporte desde Estudiantes.</p>
      </main>
    );
  }

  const statusLabel = work.status === "submitted" ? "Entregada" : "En curso";

  return (
    <main className="report-page">
      <div className="report-toolbar">
        <button className="report-download" onClick={() => window.print()} type="button">
          <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} viewBox="0 0 24 24">
            <path d="M12 4v11" />
            <path d="m7 10 5 5 5-5" />
            <path d="M4 19h16" />
          </svg>
          Descargar
        </button>
      </div>

      {/* Tabla envolvente: su thead y tfoot se repiten en cada hoja impresa y hacen de margen
          superior e inferior, porque el margen de la hoja va en 0 para que el navegador no
          imprima fecha, título ni URL en los bordes. */}
      <table className="report-sheet">
        <thead><tr><td><div className="report-sheet-top" /></td></tr></thead>
        <tbody><tr><td>
      <header className="report-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src="/ic_logo_primary.png" />
        <b>Esbot EduLab</b>
      </header>

      <div className="report-group">
        <div>
          <small>Grupo</small>
          <strong>{courseName}</strong>
        </div>
        <div className="report-group-right">
          <small>Actividad</small>
          <strong>{activityName}</strong>
        </div>
      </div>

      <dl className="report-grid">
        <div><dt>Estudiante</dt><dd>{student.fullName}</dd></div>
        <div><dt>Docente</dt><dd>{profile?.fullName ?? "Docente"}</dd></div>
        <div><dt>Correo</dt><dd>{student.email}</dd></div>
        <div><dt>Estado</dt><dd>{statusLabel}</dd></div>
        {work.createdAt ? <div><dt>Inicio</dt><dd>{formatDateTime(work.createdAt)}</dd></div> : null}
        <div><dt>Último guardado</dt><dd>{formatDateTime(work.updatedAt)}</dd></div>
        {work.submittedAt ? <div><dt>Entregado</dt><dd>{formatDateTime(work.submittedAt)}</dd></div> : null}
      </dl>

      <h2>Programa del estudiante</h2>
      {workspaceState != null ? (
        <div className="report-program">
          <BlocklyWorkspace compact fitContent initialState={workspaceState} onChange={() => {}} onFitted={() => setProgramReady(true)} readOnly />
        </div>
      ) : (
        <p className="muted">El estudiante aún no ha guardado bloques.</p>
      )}

      {mission?.steps?.length && progress ? (
        <section className="report-steps">
          <h2>Avance por pasos</h2>
          <table>
            <thead>
              <tr>
                <th className="report-steps-n">N.º</th>
                <th>Paso de la misión</th>
                <th className="report-steps-result">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {mission.steps.map((step, index) => {
                const done = index < progress.completedSteps;
                return (
                  <tr key={`${step.type}-${index}`}>
                    <td className="report-steps-n">{index + 1}</td>
                    <td>{step.label}</td>
                    <td className={done ? "report-ok" : "report-pending"}>{done ? "Completado" : "Pendiente"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      <footer className="report-footer">Esbot EduLab · edulab.esbot.co</footer>
        </td></tr></tbody>
        <tfoot><tr><td><div className="report-sheet-bottom" /></td></tr></tfoot>
      </table>
    </main>
  );
}
