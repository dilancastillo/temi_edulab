/* eslint-disable @next/next/no-img-element -- User-uploaded demo avatars are local data URLs, not optimizable remote assets. */
"use client";


import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConfirmDialog, Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/auth-store-provider";
import { ChevronSelect } from "@/components/chevron-select";
import { getInitials, parseStudentsCsv } from "@/lib/csv";
import { readFileAsDataUrl, validateImageFile } from "@/lib/file-validation";
import { formatLastSaved } from "@/lib/format-date";
import type { Course, Mission, Student, StudentInput } from "@/lib/types";
import { FREE_PLAY_ASSIGNMENT_ID, FREE_PLAY_MISSION_ID } from "@/lib/types";
import { ExecuteButton } from "@/components/execute-button";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { StudentProgramPreview } from "@/components/student-program-preview";
import { extractCommandsFromWorkspace } from "@/lib/robot-adapter";

const pageSize = 5;
const progressFilters = ["Todos", "En curso", "Revisar", "Calificado"] as const;

export function StudentsScreen() {
  const { addStudent, courses, assignments, deleteStudent, importStudents, missions, refreshTeacherData, students, studentWorks, updateStudent } = useDemoStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchParams = useSearchParams();
  const initialMissionId = searchParams.get("mision") ?? "all";
  const initialCourseId = searchParams.get("curso") ?? "all";

  const [query, setQuery] = useState("");
  const [courseId, setCourseId] = useState(initialCourseId);
  const [progress, setProgress] = useState<(typeof progressFilters)[number]>("Todos");
  const [missionId, setMissionId] = useState(initialMissionId);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<"add" | "import" | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentToPreview, setStudentToPreview] = useState<{ student: Student; workspaceState: unknown; mission?: Mission } | null>(null);

  const filteredStudents = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    // Para juego libre: mostrar estudiantes que tienen progreso en free-play
    if (missionId === FREE_PLAY_MISSION_ID) {
      const studentIdsWithFreePlay = new Set(
        studentWorks
          .filter((w) => w.assignmentId === FREE_PLAY_ASSIGNMENT_ID)
          .map((w) => w.studentId)
      );
      return students.filter((student) => {
        const matchesQuery =
          !normalisedQuery ||
          student.fullName.toLowerCase().includes(normalisedQuery) ||
          student.email.toLowerCase().includes(normalisedQuery);
        const matchesCourse = courseId === "all" || student.courseId === courseId;
        const matchesProgress = progress === "Todos" || student.progress === progress;
        return matchesQuery && matchesCourse && matchesProgress && studentIdsWithFreePlay.has(student.id);
      });
    }

    // Para el filtro de misión: buscar qué cursos tienen esa misión asignada
    const courseIdsWithMission = missionId === "all"
      ? null
      : new Set(
          assignments
            .filter((a) => a.status === "active" && a.missionId === missionId)
            .map((a) => a.courseId)
        );

    return students.filter((student) => {
      const matchesQuery =
        !normalisedQuery ||
        student.fullName.toLowerCase().includes(normalisedQuery) ||
        student.email.toLowerCase().includes(normalisedQuery);
      const matchesCourse = courseId === "all" || student.courseId === courseId;
      const matchesProgress = progress === "Todos" || student.progress === progress;
      const matchesMission = courseIdsWithMission === null || courseIdsWithMission.has(student.courseId);
      return matchesQuery && matchesCourse && matchesProgress && matchesMission;
    });
  }, [assignments, courseId, missionId, progress, query, students, studentWorks]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const boundedPage = Math.min(page, totalPages);
  const pageStudents = filteredStudents.slice((boundedPage - 1) * pageSize, boundedPage * pageSize);

  function resetPagination() {
    setPage(1);
  }

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <div className="action-row">
            <button
              className="button button-ghost"
              disabled={isRefreshing}
              onClick={async () => {
                setIsRefreshing(true);
                await refreshTeacherData();
                setIsRefreshing(false);
              }}
              title="Trae el trabajo más reciente que guardaron los estudiantes"
              type="button"
            >
              {isRefreshing ? "Actualizando…" : "Actualizar"}
            </button>
            <button className="button button-secondary" onClick={() => setMode("import")} type="button">
              Importar CSV
            </button>
            <button className="button button-primary" onClick={() => setMode("add")} type="button">
              Agregar estudiante
            </button>
          </div>
        }
        description="Administra estudiantes por grupo, progreso y misión asignada."
        eyebrow="Gestión académica"
        title="Directorio de Estudiantes"
      />

      <section aria-label="Filtros de estudiantes" className="students-toolbar">
        <label className="toolbar-search" htmlFor="student-search">
          <ToolbarIcon d={["M21 21l-4.3-4.3", "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"]} />
          <span className="sr-only">Buscar</span>
          <input
            id="student-search"
            onChange={(event) => {
              setQuery(event.target.value);
              resetPagination();
            }}
            placeholder="Buscar por nombre o correo"
            type="search"
            value={query}
          />
        </label>
        <div className="toolbar-filters">
          <label className="toolbar-select" htmlFor="course-filter">
            <span className="sr-only">Curso</span>
            <ChevronSelect
              id="course-filter"
              onChange={(event) => {
                setCourseId(event.target.value);
                resetPagination();
              }}
              value={courseId}
            >
              <option value="all">Todos los cursos</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </ChevronSelect>
          </label>
          <span aria-hidden="true" className="toolbar-divider" />
          <label className="toolbar-select" htmlFor="progress-filter">
            <span className="sr-only">Progreso</span>
            <ChevronSelect
              id="progress-filter"
              onChange={(event) => {
                setProgress(event.target.value as (typeof progressFilters)[number]);
                resetPagination();
              }}
              value={progress}
            >
              {progressFilters.map((option) => (
                <option key={option} value={option}>
                  {option === "Todos" ? "Todo el progreso" : option}
                </option>
              ))}
            </ChevronSelect>
          </label>
          <span aria-hidden="true" className="toolbar-divider" />
          <label className="toolbar-select" htmlFor="mission-filter">
            <span className="sr-only">Misión</span>
            <ChevronSelect
              id="mission-filter"
              onChange={(event) => {
                setMissionId(event.target.value);
                resetPagination();
              }}
              value={missionId}
            >
              <option value="all">Todas las misiones</option>
              <option value={FREE_PLAY_MISSION_ID}>Juego libre</option>
              {missions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.title}
                </option>
              ))}
            </ChevronSelect>
          </label>
        </div>
      </section>

      <section aria-labelledby="students-table-title" className="table-card">
        <div className="sr-only" id="students-table-title">
          Estudiantes filtrados
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Curso</th>
                <th scope="col">Progreso</th>
                <th scope="col">Misión</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageStudents.map((student) => {
                const course = courses.find((candidate) => candidate.id === student.courseId);
                
                // Buscar si hay una asignación activa para el curso del estudiante
                const activeAssignment = assignments.find(
                  (a) => a.status === "active" && a.courseId === student.courseId
                );
                
                const displayMissionId = missionId !== "all" ? missionId : activeAssignment?.missionId;
                const mission = missions.find((candidate) => candidate.id === displayMissionId);

                // Calcular progreso por misión usando studentWorks
                const missionAssignment = missionId !== "all" && missionId !== FREE_PLAY_MISSION_ID
                  ? assignments.find((a) => a.missionId === missionId && a.courseId === student.courseId && a.status === "active")
                  : activeAssignment;
                const studentWork = missionId === FREE_PLAY_MISSION_ID
                  ? studentWorks.find((w) => w.studentId === student.id && w.assignmentId === FREE_PLAY_ASSIGNMENT_ID)
                  : missionAssignment
                    ? studentWorks.find((w) => w.studentId === student.id && w.assignmentId === missionAssignment.id)
                    : null;
                const missionProgress: typeof student.progress = studentWork?.status === "submitted"
                  ? "Revisar"
                  : missionId !== "all" && missionAssignment
                    ? "En curso"
                    : activeAssignment
                      ? "En curso"
                      : "En curso"; // Fallback si no hay misión activa pero el estudiante tiene progreso

                return (
                  <tr key={student.id}>
                    <td>
                      <div className="person-cell">
                        {student.avatarUrl ? (
                          <img alt="" className="avatar avatar-image" src={student.avatarUrl} />
                        ) : (
                          <span className="avatar">{getInitials(student.fullName)}</span>
                        )}
                        <span>
                          <strong>{student.fullName}</strong>
                          <small>{student.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>{course?.name ?? "Sin curso"}</td>
                    <td>
                      {activeAssignment || missionAssignment ? (
                        <span className={`status-pill status-${missionProgress.toLowerCase().replace(" ", "-")}`}>
                          {missionProgress}
                        </span>
                      ) : (
                        "Ninguno"
                      )}
                      {studentWork ? (
                        <small className="muted" style={{ display: "block", marginTop: "0.25rem" }}>
                          Guardado {formatLastSaved(studentWork.updatedAt)}
                        </small>
                      ) : null}
                    </td>
                    <td>{mission?.title ?? "Ninguno"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div className="table-actions" style={{ flexWrap: "nowrap" }}>
                        <RowActionsMenu
                          actions={[
                            { label: "Editar", onSelect: () => setStudentToEdit(student) },
                            { label: "Eliminar", onSelect: () => setStudentToDelete(student), tone: "danger" },
                            ...(studentWork?.workspaceState != null
                              ? [{ label: "Reporte", href: `/profesor/reporte?assignment=${encodeURIComponent(studentWork.assignmentId)}&student=${encodeURIComponent(student.id)}` }]
                              : [])
                          ]}
                          label={`Acciones de ${student.fullName}`}
                        />
                        {studentWork?.workspaceState != null && (
                          <button
                            className="button button-ghost"
                            onClick={() => setStudentToPreview({ student, workspaceState: studentWork.workspaceState, mission })}
                            type="button"
                          >
                            Ver
                          </button>
                        )}
                        {studentWork?.workspaceState != null && (
                          <ExecuteButton
                            inline
                            label="Ejecutar"
                            workspaceState={studentWork.workspaceState}
                            sequence={extractCommandsFromWorkspace(studentWork.workspaceState).map((c) => {
                              if (c.type === "Navigate") return "temi_move";
                              if (c.type === "Say") return "temi_say";
                              if (c.type === "WhileMqtt" || c.type === "WhileTimer" || c.type === "WhileListen") return "temi_move";
                              return "temi_show_image";
                            })}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <footer className="table-footer">
          <span>
            Mostrando {pageStudents.length} de {filteredStudents.length} estudiantes
          </span>
          <div className="pagination" aria-label="Paginacion">
            <button className="icon-button" disabled={boundedPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
              Anterior
            </button>
            <strong>
              {boundedPage} / {totalPages}
            </strong>
            <button
              className="icon-button"
              disabled={boundedPage === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </footer>
      </section>

      {mode === "add" ? (
        <StudentFormModal
          courses={courses}
          onClose={() => setMode(null)}
          onSubmit={async (input) => {
            const result = await addStudent(input);
            if (!result.ok) return result.message ?? "Error al crear estudiante.";
            setMode(null);
            return null;
          }}
          title="Agregar estudiante"
        />
      ) : null}

      {studentToEdit ? (
        <StudentFormModal
          courses={courses}
          initialStudent={studentToEdit}
          onClose={() => setStudentToEdit(null)}
          onSubmit={async (input) => {
            const result = await updateStudent(studentToEdit.id, input);
            if (!result.ok) return result.message ?? "Error al actualizar estudiante.";
            setStudentToEdit(null);
            return null;
          }}
          title="Editar estudiante"
        />
      ) : null}

      {mode === "import" ? (
        <ImportStudentsModal
          onClose={() => setMode(null)}
          onImport={(rows) => {
            const result = importStudents(rows);
            return result;
          }}
        />
      ) : null}

      {studentToDelete ? (
        <ConfirmDialog
          body={
            <p>
              Esta acción quitará a <strong>{studentToDelete.fullName}</strong> del directorio demo. En producción conviene
              usar baja controlada para conservar auditoría académica.
            </p>
          }
          confirmLabel="Eliminar definitivamente"
          onCancel={() => setStudentToDelete(null)}
          onConfirm={() => {
            deleteStudent(studentToDelete.id);
            setStudentToDelete(null);
          }}
          title="Eliminar estudiante"
          tone="danger"
        />
      ) : null}

      {studentToPreview ? (
        <StudentProgramPreview
          mission={studentToPreview.mission}
          studentName={studentToPreview.student.fullName}
          workspaceState={studentToPreview.workspaceState}
          onClose={() => setStudentToPreview(null)}
        />
      ) : null}
    </div>
  );
}

function StudentFormModal({
  courses,
  initialStudent,
  onClose,
  onSubmit,
  title
}: Readonly<{
  courses: Course[];
  initialStudent?: Student;
  onClose: () => void;
  onSubmit: (input: StudentInput) => Promise<string | null>;
  title: string;
}>) {
  const [fullName, setFullName] = useState(initialStudent?.fullName ?? "");
  const [email, setEmail] = useState(initialStudent?.email ?? "");
  const [password, setPassword] = useState("");
  const [courseId, setCourseId] = useState(initialStudent?.courseId ?? courses[0]?.id ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialStudent?.avatarUrl);
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!initialStudent;

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const error = validateImageFile(file);
    if (error) { setFileError(error); return; }
    setFileError("");
    setAvatarUrl(await readFileAsDataUrl(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    const error = await onSubmit({ avatarUrl, courseId, email, fullName, password: password || "" });
    setSubmitting(false);
    if (error) setSubmitError(error);
  }

  return (
    <Modal onClose={onClose} title={title}>
      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="profile-upload">
          {avatarUrl ? <img alt="" className="avatar avatar-large avatar-image" src={avatarUrl} /> : <span className="avatar avatar-large">Foto</span>}
          <label className="file-button">
            Foto de perfil
            <input accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} type="file" />
          </label>
          <small>JPG, PNG o WebP. Máximo 2 MB.</small>
          {fileError ? <p className="form-error">{fileError}</p> : null}
        </div>
        <label className="field" htmlFor="student-name">
          Nombre completo
          <input autoComplete="name" id="student-name" maxLength={120} onChange={(event) => setFullName(event.target.value)} required value={fullName} />
        </label>
        <label className="field" htmlFor="student-email">
          Correo electrónico
          <input autoComplete="email" id="student-email" maxLength={160} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label className="field" htmlFor="student-password">
          Contraseña
          {isEditing && (
            <small style={{ color: "var(--color-text-muted)", marginBottom: "4px", display: "block" }}>
              El estudiante ya tiene contraseña. Escribe una nueva para cambiarla o deja vacío para mantenerla.
            </small>
          )}
          <input
            autoComplete="new-password"
            id="student-password"
            minLength={6}
            maxLength={60}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isEditing ? "••••••••" : "Mínimo 6 caracteres"}
            required={!isEditing}
            type="password"
            value={password}
          />
        </label>
        <label className="field" htmlFor="student-course">
          Curso
          <select id="student-course" onChange={(event) => setCourseId(event.target.value)} required value={courseId}>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button className="button button-ghost" onClick={onClose} type="button">Cancelar</button>
          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? "Guardando..." : "Guardar estudiante"}
          </button>
        </div>
        {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
      </form>
    </Modal>
  );
}

function ImportStudentsModal({
  onClose,
  onImport
}: Readonly<{
  onClose: () => void;
  onImport: (rows: ReturnType<typeof parseStudentsCsv>["students"]) => Promise<{ added: number; skipped: string[] }>;
}>) {
  const [csvName, setCsvName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvName(file.name);
    setSummary("");

    if (file.size > 256 * 1024) {
      setErrors(["El archivo debe pesar máximo 256 KB para el modo demo."]);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setErrors(["Carga un archivo CSV."]);
      return;
    }

    const text = await file.text();
    const parsed = parseStudentsCsv(text);
    if (parsed.errors.length > 0) {
      setErrors(parsed.errors);
      return;
    }

    const result = await onImport(parsed.students);
    setErrors(result.skipped);
    setSummary(`${result.added} estudiantes importados desde ${file.name}.`);
  }

  return (
    <Modal onClose={onClose} title="Importar estudiantes">
      <div className="import-panel">
        <p>Sube un CSV con encabezados: nombre, correo, curso.</p>
        <label className="file-button">
          Seleccionar CSV
          <input accept=".csv,text/csv" onChange={handleFileChange} type="file" />
        </label>
        {csvName ? <p className="muted">Archivo: {csvName}</p> : null}
        {summary ? <p className="success-message">{summary}</p> : null}
        {errors.length > 0 ? (
          <div className="form-error" role="alert">
            <strong>Revisa estos detalles:</strong>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="modal-actions">
        <button className="button button-primary" onClick={onClose} type="button">
          Listo
        </button>
      </div>
    </Modal>
  );
}

// Íconos de contorno (trazos de Lucide, licencia ISC) para la barra de filtros.
function ToolbarIcon({ d }: Readonly<{ d: string[] }>) {
  return (
    <svg aria-hidden="true" className="toolbar-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
      {d.map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}
