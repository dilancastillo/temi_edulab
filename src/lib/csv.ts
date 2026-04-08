import type { ImportResult, ImportedStudent } from "@/lib/types";

const headerAliases = {
  fullName: ["nombre", "nombre completo", "full name", "fullname", "name"],
  email: ["correo", "correo electronico", "correo electrónico", "email", "e-mail"],
  courseName: ["curso", "grado", "grupo", "course", "class"]
};

function normaliseHeader(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function findHeaderIndex(headers: string[], aliases: string[]) {
  const normalisedAliases = aliases.map(normaliseHeader);
  return headers.findIndex((header) => normalisedAliases.includes(normaliseHeader(header)));
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseStudentsCsv(csv: string): ImportResult {
  const rows = parseCsvRows(csv);
  const errors: string[] = [];

  if (rows.length < 2) {
    return { students: [], errors: ["El archivo debe incluir encabezados y al menos un estudiante."] };
  }

  const [headers, ...records] = rows;
  const fullNameIndex = findHeaderIndex(headers, headerAliases.fullName);
  const emailIndex = findHeaderIndex(headers, headerAliases.email);
  const courseIndex = findHeaderIndex(headers, headerAliases.courseName);

  if (fullNameIndex === -1 || emailIndex === -1 || courseIndex === -1) {
    return {
      students: [],
      errors: ["Usa encabezados para nombre, correo y curso. Ejemplo: nombre,correo,curso."]
    };
  }

  const students: ImportedStudent[] = [];
  const seenEmails = new Set<string>();

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const fullName = record[fullNameIndex]?.trim() ?? "";
    const email = record[emailIndex]?.trim().toLowerCase() ?? "";
    const courseName = record[courseIndex]?.trim() ?? "";

    if (!fullName || !email || !courseName) {
      errors.push(`Fila ${rowNumber}: nombre, correo y curso son obligatorios.`);
      return;
    }

    if (!isValidEmail(email)) {
      errors.push(`Fila ${rowNumber}: el correo no tiene un formato válido.`);
      return;
    }

    if (seenEmails.has(email)) {
      errors.push(`Fila ${rowNumber}: el correo ${email} está duplicado en el archivo.`);
      return;
    }

    seenEmails.add(email);
    students.push({ fullName, email, courseName });
  });

  return { students, errors };
}

export function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
