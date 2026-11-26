"use client";

import { type ChangeEvent, useState } from "react";
import { Modal } from "@/components/modal";
import { buildImportPreview, type ImportPreview, validStudents } from "@/lib/student-import";
import { downloadStudentTemplate, readStudentFile } from "@/lib/student-import-file";
import type { Course, ImportedStudent } from "@/lib/types";

type ImportOutcome = { added: number; skipped: string[] };

/**
 * Importar estudiantes desde Excel (.xlsx) o CSV: plantilla descargable, vista previa con los
 * errores de cada fila y guardado solo de las filas válidas.
 */
export function ImportStudentsModal({
  courses,
  existingEmails,
  onClose,
  onImport
}: Readonly<{
  courses: Course[];
  existingEmails: string[];
  onClose: () => void;
  onImport: (rows: ImportedStudent[]) => Promise<ImportOutcome>;
}>) {
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  const ready = preview ? validStudents(preview) : [];
  const withErrors = preview ? preview.rows.filter((row) => row.errors.length > 0).length : 0;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo después de corregirlo
    if (!file) return;

    setFileName(file.name);
    setFileError("");
    setPreview(null);
    setOutcome(null);
    setIsReading(true);
    const result = await readStudentFile(file);
    setIsReading(false);

    if ("error" in result) {
      setFileError(result.error);
      return;
    }
    const nextPreview = buildImportPreview(result.table, courses, existingEmails);
    if (nextPreview.fileError) {
      setFileError(nextPreview.fileError);
      return;
    }
    setPreview(nextPreview);
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      await downloadStudentTemplate(courses);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleImport() {
    setIsImporting(true);
    const result = await onImport(ready);
    setIsImporting(false);
    setOutcome(result);
    setPreview(null);
  }

  return (
    <Modal onClose={onClose} title="Importar estudiantes">
      <div className="import-panel">
        <p className="import-intro">
          Sube un archivo de Excel (.xlsx) o CSV con las columnas <strong>nombre</strong>, <strong>correo</strong>,{" "}
          <strong>contraseña</strong> y <strong>curso</strong>. El curso debe ser uno de: {courses.map((c) => c.name).join(", ")}.
        </p>

        <div className="import-actions">
          <button className="pill-button pill-button-outline" disabled={isDownloading} onClick={() => void handleDownload()} type="button">
            {isDownloading ? "Preparando…" : "Descargar plantilla"}
          </button>
          <label className="pill-button pill-button-primary import-file-label">
            {fileName ? "Cambiar archivo" : "Seleccionar archivo"}
            <input
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(event) => void handleFile(event)}
              type="file"
            />
          </label>
        </div>

        {fileName ? <p className="muted import-file-name">Archivo: {fileName}</p> : null}
        {isReading ? <p className="muted">Leyendo el archivo…</p> : null}
        {fileError ? (
          <p className="form-error" role="alert">
            {fileError}
          </p>
        ) : null}

        {preview ? (
          <>
            <p className="import-summary">
              <span className="import-count import-count-ok">{ready.length} listos para importar</span>
              {withErrors > 0 ? <span className="import-count import-count-error">{withErrors} con errores (no se importan)</span> : null}
            </p>
            <div className="import-preview">
              <table>
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Curso</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr className={row.errors.length > 0 ? "import-row-error" : undefined} key={row.row}>
                      <td>{row.row}</td>
                      <td>{row.fullName || "—"}</td>
                      <td>{row.email || "—"}</td>
                      <td>{row.courseName || "—"}</td>
                      <td>
                        {row.errors.length === 0 ? (
                          <span className="import-status-ok">Listo</span>
                        ) : (
                          <ul className="import-errors">
                            {row.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {outcome ? (
          <div className="import-outcome" role="status">
            <p className="success-message">
              {outcome.added === 1 ? "1 estudiante importado." : `${outcome.added} estudiantes importados.`}
            </p>
            {outcome.skipped.length > 0 ? (
              <div className="form-error" role="alert">
                <strong>No se guardaron:</strong>
                <ul>
                  {outcome.skipped.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="modal-actions">
        {preview ? (
          <>
            <button className="button button-ghost" onClick={onClose} type="button">
              Cancelar
            </button>
            <button
              className="button button-primary"
              disabled={ready.length === 0 || isImporting}
              onClick={() => void handleImport()}
              type="button"
            >
              {isImporting
                ? "Importando…"
                : ready.length === 1
                  ? "Importar 1 estudiante"
                  : `Importar ${ready.length} estudiantes`}
            </button>
          </>
        ) : (
          <button className="button button-primary" onClick={onClose} type="button">
            {outcome ? "Listo" : "Cerrar"}
          </button>
        )}
      </div>
    </Modal>
  );
}
