import type { Course } from "@/lib/types";
import { decodeCsvBytes, IMPORT_COLUMNS, parseCsvTable } from "@/lib/student-import";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const TEMPLATE_ROWS = 500;

type FileTable = { table: string[][] } | { error: string };

/** Lee un .xlsx o .csv como tabla de texto (primera hoja en Excel). Solo en el navegador. */
export async function readStudentFile(file: File): Promise<FileTable> {
  const name = file.name.toLowerCase();
  if (file.size > MAX_FILE_BYTES) return { error: "El archivo debe pesar máximo 2 MB." };

  if (name.endsWith(".csv")) {
    return { table: parseCsvTable(decodeCsvBytes(new Uint8Array(await file.arrayBuffer()))) };
  }
  if (name.endsWith(".xls")) {
    return { error: "Este es un Excel antiguo (.xls). Ábrelo y guárdalo como «Libro de Excel (.xlsx)», o usa la plantilla." };
  }
  if (!name.endsWith(".xlsx")) {
    return { error: "Sube un archivo de Excel (.xlsx) o CSV (.csv)." };
  }

  try {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) return { error: "El archivo de Excel no tiene hojas." };

    const table: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const cells: string[] = [];
      for (let col = 1; col <= IMPORT_COLUMNS.length + 4; col += 1) {
        // .text da lo que se ve en Excel: resuelve fórmulas, hipervínculos (correos) y números.
        cells.push(row.getCell(col).text?.trim() ?? "");
      }
      table[rowNumber - 1] = cells;
    });
    return { table: Array.from(table, (row) => row ?? []) };
  } catch {
    return { error: "No se pudo leer el archivo de Excel. Revisa que no esté dañado o protegido con contraseña." };
  }
}

/** Descarga la plantilla de Excel con las columnas y el curso como lista desplegable. */
export async function downloadStudentTemplate(courses: Course[]) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Esbot EduLab";

  const sheet = workbook.addWorksheet("Estudiantes", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "nombre", key: "nombre", width: 32 },
    { header: "correo", key: "correo", width: 34 },
    { header: "contraseña", key: "contrasena", width: 18, style: { numFmt: "@" } },
    { header: "curso", key: "curso", width: 18 }
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2856A6" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;

  const list = workbook.addWorksheet("Cursos");
  list.columns = [{ header: "Cursos disponibles", key: "curso", width: 26 }];
  list.getRow(1).font = { bold: true };
  courses.forEach((course) => list.addRow({ curso: course.name }));

  const range = `Cursos!$A$2:$A$${courses.length + 1}`;
  for (let row = 2; row <= TEMPLATE_ROWS + 1; row += 1) {
    sheet.getCell(`D${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [range],
      showErrorMessage: true,
      errorTitle: "Curso no válido",
      error: "Elige un curso de la lista."
    };
    sheet.getCell(`C${row}`).numFmt = "@";
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "plantilla_estudiantes.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
