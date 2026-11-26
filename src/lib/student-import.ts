import type { Course, ImportedStudent } from "@/lib/types";

/** Columnas de la plantilla, en orden. */
export const IMPORT_COLUMNS = ["nombre", "correo", "contraseña", "curso"] as const;

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 60;
const NAME_MAX_LENGTH = 120;
const EMAIL_MAX_LENGTH = 160;

const headerAliases = {
  fullName: ["nombre", "nombre completo", "nombres", "full name", "fullname", "name"],
  email: ["correo", "correo electronico", "email", "e-mail", "mail"],
  password: ["contrasena", "clave", "password", "contraseña inicial"],
  courseName: ["curso", "grado", "grupo", "course", "class"]
};

/** Una fila del archivo ya revisada: si `errors` está vacío, se puede importar. */
export type ImportRow = {
  /** Número de fila tal como lo ve el profesor en Excel (la 1 es el encabezado). */
  row: number;
  fullName: string;
  email: string;
  password: string;
  courseName: string;
  courseId: string | null;
  errors: string[];
};

export type ImportPreview = {
  rows: ImportRow[];
  /** Error del archivo completo (sin encabezados, vacío...). */
  fileError: string | null;
};

function normalise(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "10A", "10 a" y "10 A" cuentan como el mismo curso. */
function courseKey(value: string) {
  return normalise(value).replace(/\s+/g, "");
}

function findHeaderIndex(headers: string[], aliases: string[]) {
  const wanted = aliases.map(normalise);
  return headers.findIndex((header) => wanted.includes(normalise(header)));
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Revisa las filas del archivo (la primera es el encabezado) contra los cursos del selector y los
 * correos que ya existen en el directorio del profesor.
 */
export function buildImportPreview(table: string[][], courses: Course[], existingEmails: Iterable<string>): ImportPreview {
  const rows = table.filter((row) => row.some((cell) => cell.trim() !== ""));
  if (rows.length < 2) {
    return { rows: [], fileError: "El archivo debe tener la fila de encabezados y al menos un estudiante." };
  }

  const [headers, ...records] = rows;
  const indexes = {
    fullName: findHeaderIndex(headers, headerAliases.fullName),
    email: findHeaderIndex(headers, headerAliases.email),
    password: findHeaderIndex(headers, headerAliases.password),
    courseName: findHeaderIndex(headers, headerAliases.courseName)
  };
  if (Object.values(indexes).some((index) => index === -1)) {
    return {
      rows: [],
      fileError: "El archivo debe tener las columnas nombre, correo, contraseña y curso. Descarga la plantilla para ver el formato."
    };
  }

  const coursesByKey = new Map(courses.map((course) => [courseKey(course.name), course]));
  const courseList = courses.map((course) => course.name).join(", ");
  const registered = new Set([...existingEmails].map((email) => email.toLowerCase()));
  const seen = new Set<string>();
  // Número real de fila en el archivo (las filas vacías también cuentan en Excel).
  const rowNumbers = table
    .map((row, index) => ({ row, number: index + 1 }))
    .filter(({ row }) => row.some((cell) => cell.trim() !== ""))
    .slice(1)
    .map(({ number }) => number);

  const parsed = records.map((record, index): ImportRow => {
    const cell = (i: number) => (record[i] ?? "").trim();
    const fullName = cell(indexes.fullName).replace(/\s+/g, " ");
    const email = cell(indexes.email).toLowerCase();
    const password = cell(indexes.password);
    const courseName = cell(indexes.courseName);
    const course = courseName ? coursesByKey.get(courseKey(courseName)) : undefined;
    const errors: string[] = [];

    if (!fullName) errors.push("Falta el nombre.");
    else if (fullName.length > NAME_MAX_LENGTH) errors.push(`El nombre supera ${NAME_MAX_LENGTH} caracteres.`);

    if (!email) errors.push("Falta el correo.");
    else if (!isValidEmail(email) || email.length > EMAIL_MAX_LENGTH) errors.push("El correo no tiene un formato válido.");
    else if (registered.has(email)) errors.push("Ya hay un estudiante con este correo.");
    else if (seen.has(email)) errors.push("El correo está repetido en el archivo.");

    if (!password) errors.push("Falta la contraseña.");
    else if (password.length < PASSWORD_MIN_LENGTH) errors.push(`La contraseña debe tener mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
    else if (password.length > PASSWORD_MAX_LENGTH) errors.push(`La contraseña supera ${PASSWORD_MAX_LENGTH} caracteres.`);

    if (!courseName) errors.push("Falta el curso.");
    else if (!course) errors.push(`El curso «${courseName}» no existe. Usa uno de estos: ${courseList}.`);

    if (email) seen.add(email);

    return {
      row: rowNumbers[index] ?? index + 2,
      fullName,
      email,
      password,
      courseName: course?.name ?? courseName,
      courseId: course?.id ?? null,
      errors
    };
  });

  return { rows: parsed, fileError: null };
}

/** Filas sin errores, listas para guardar. */
export function validStudents(preview: ImportPreview): ImportedStudent[] {
  return preview.rows
    .filter((row) => row.errors.length === 0 && row.courseId)
    .map((row) => ({ fullName: row.fullName, email: row.email, password: row.password, courseId: row.courseId as string }));
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

/**
 * Texto de un CSV. Excel en español guarda en Windows-1252, no en UTF-8: si el archivo no es
 * UTF-8 válido se lee como Windows-1252 para no dañar tildes ni la ñ.
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return text.replace(/^﻿/, "");
}

/** Excel en español separa con punto y coma; Google Sheets con coma. Se decide por el encabezado. */
function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (char: string) => firstLine.split(char).length - 1;
  return count(";") > count(",") ? ";" : ",";
}

export function parseCsvTable(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        current += "\"";
        index += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(current);
      current = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current);
  rows.push(row);
  return rows.map((cells) => cells.map((cell) => cell.trim()));
}
