/* eslint-disable @next/next/no-img-element -- User-uploaded demo avatars are local data URLs, not optimizable remote assets. */
"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConfirmDialog, Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/demo-store-provider";
import { getInitials, parseStudentsCsv } from "@/lib/csv";
import { readFileAsDataUrl, validateImageFile } from "@/lib/file-validation";
import type { Course, Student, StudentInput } from "@/lib/types";

const pageSize = 5;
const progressFilters = ["Todos", "En curso", "Revisar", "Calificado"] as const;

export function StudentsScreen() {
  const { addStudent, courses, deleteStudent, importStudents, missions, students, updateStudent } = useDemoStore();
  const searchParams = useSearchParams();
  const initialMissionId = searchParams.get("mision") ?? "all";

  const [query, setQuery] = useState("");
  const [courseId, setCourseId] = useState("all");
  const [progress, setProgress] = useState<(typeof progressFilters)[number]>("Todos");
  const [missionId, setMissionId] = useState(initialMissionId);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<"add" | "import" | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const filteredStudents = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    return students.filter((student) => {
      const matchesQuery =
        !normalisedQuery ||
        student.fullName.toLowerCase().includes(normalisedQuery) ||
        student.email.toLowerCase().includes(normalisedQuery);
      const matchesCourse = courseId === "all" || student.courseId === courseId;
      const matchesProgress = progress === "Todos" || student.progress === progress;
      const matchesMission = missionId === "all" || student.currentMissionId === missionId;
      return matchesQuery && matchesCourse && matchesProgress && matchesMission;
    });
  }, [courseId, missionId, progress, query, students]);

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

      <section aria-label="Filtros de estudiantes" className="filter-panel filter-panel-wrap">
        <label className="search-field" htmlFor="student-search">
          Buscar
          <input
            id="student-search"
            onChange={(event) => {
              setQuery(event.target.value);
              resetPagination();
            }}
            placeholder="Nombre o correo"
            type="search"
            value={query}
          />
        </label>
        <label className="select-field" htmlFor="course-filter">
          Curso
          <select
            id="course-filter"
            onChange={(event) => {
              setCourseId(event.target.value);
              resetPagination();
            }}
            value={courseId}
          >
            <option value="all">Todos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field" htmlFor="progress-filter">
          Progreso
          <select
            id="progress-filter"
            onChange={(event) => {
              setProgress(event.target.value as (typeof progressFilters)[number]);
              resetPagination();
            }}
            value={progress}
          >
            {progressFilters.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field" htmlFor="mission-filter">
          Misión
          <select
            id="mission-filter"
            onChange={(event) => {
              setMissionId(event.target.value);
              resetPagination();
            }}
            value={missionId}
          >
            <option value="all">Todas</option>
            {missions.map((mission) => (
              <option key={mission.id} value={mission.id}>
                {mission.title}
              </option>
            ))}
          </select>
        </label>
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
                const mission = missions.find((candidate) => candidate.id === student.currentMissionId);

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
                      <span className={`status-pill status-${student.progress.toLowerCase().replace(" ", "-")}`}>
                        {student.progress}
                      </span>
                    </td>
                    <td>{mission?.title ?? "Sin misión"}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button button-secondary" onClick={() => setStudentToEdit(student)} type="button">
                          Editar
                        </button>
                        <button className="button button-danger-outline" onClick={() => setStudentToDelete(student)} type="button">
                          Eliminar
                        </button>
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
          onSubmit={(input) => {
            addStudent(input);
            setMode(null);
          }}
          title="Agregar estudiante"
        />
      ) : null}

      {studentToEdit ? (
        <StudentFormModal
          courses={courses}
          initialStudent={studentToEdit}
          onClose={() => setStudentToEdit(null)}
          onSubmit={(input) => {
            updateStudent(studentToEdit.id, input);
            setStudentToEdit(null);
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
  onSubmit: (input: StudentInput) => void;
  title: string;
}>) {
  const [fullName, setFullName] = useState(initialStudent?.fullName ?? "");
  const [email, setEmail] = useState(initialStudent?.email ?? "");
  const [courseId, setCourseId] = useState(initialStudent?.courseId ?? courses[0]?.id ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialStudent?.avatarUrl);
  const [fileError, setFileError] = useState("");

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setFileError(error);
      return;
    }

    setFileError("");
    setAvatarUrl(await readFileAsDataUrl(file));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ avatarUrl, courseId, email, fullName });
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
          <input
            autoComplete="name"
            id="student-name"
            maxLength={120}
            onChange={(event) => setFullName(event.target.value)}
            required
            value={fullName}
          />
        </label>
        <label className="field" htmlFor="student-email">
          Correo electrónico
          <input
            autoComplete="email"
            id="student-email"
            maxLength={160}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="field" htmlFor="student-course">
          Curso
          <select id="student-course" onChange={(event) => setCourseId(event.target.value)} required value={courseId}>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button className="button button-ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="button button-primary" type="submit">
            Guardar estudiante
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ImportStudentsModal({
  onClose,
  onImport
}: Readonly<{
  onClose: () => void;
  onImport: (rows: ReturnType<typeof parseStudentsCsv>["students"]) => { added: number; skipped: string[] };
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

    const result = onImport(parsed.students);
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
