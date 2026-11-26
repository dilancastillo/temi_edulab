import { describe, expect, it } from "vitest";
import { getInitials } from "@/lib/csv";
import { buildImportPreview, decodeCsvBytes, parseCsvTable, validStudents } from "@/lib/student-import";
import type { Course } from "@/lib/types";

const courses: Course[] = [
  { id: "course-10a", institutionId: "i", name: "10 A", level: "10" },
  { id: "course-robotica", institutionId: "i", name: "Club Robótica", level: "Extra" }
];

describe("parseCsvTable", () => {
  it("lee CSV separado por comas (Google Sheets)", () => {
    expect(parseCsvTable("nombre,correo\nAna,ana@x.co")).toEqual([["nombre", "correo"], ["Ana", "ana@x.co"]]);
  });

  it("lee CSV separado por punto y coma (Excel en español) y respeta comillas", () => {
    expect(parseCsvTable('nombre;curso\r\n"García; Ana";10 A')).toEqual([["nombre", "curso"], ["García; Ana", "10 A"]]);
  });
});

describe("decodeCsvBytes", () => {
  it("conserva tildes y ñ de un CSV guardado por Excel en Windows-1252", () => {
    const bytes = new Uint8Array([0x4a, 0x6f, 0x73, 0xe9, 0x20, 0x4d, 0x75, 0xf1, 0x6f, 0x7a]); // "José Muñoz"
    expect(decodeCsvBytes(bytes)).toBe("José Muñoz");
  });

  it("lee UTF-8 y quita la marca BOM", () => {
    expect(decodeCsvBytes(new TextEncoder().encode("﻿José"))).toBe("José");
  });
});

describe("buildImportPreview", () => {
  const header = ["nombre", "correo", "contraseña", "curso"];

  it("marca como listas las filas válidas y acepta el curso escrito sin espacio", () => {
    const preview = buildImportPreview([header, ["Ana García", "ANA@x.co", "secreto1", "10a"]], courses, []);

    expect(preview.fileError).toBeNull();
    expect(validStudents(preview)).toEqual([
      { fullName: "Ana García", email: "ana@x.co", password: "secreto1", courseId: "course-10a" }
    ]);
  });

  it("explica por qué no se importa cada fila con error", () => {
    const preview = buildImportPreview(
      [
        header,
        ["Luis", "luis@x.co", "secreto1", "6 B"],
        ["", "no-es-correo", "123", ""],
        ["Eva", "eva@x.co", "secreto1", "10 A"],
        ["Eva 2", "eva@x.co", "secreto1", "10 A"],
        ["Pía", "pia@x.co", "secreto1", "club robotica"]
      ],
      courses,
      ["pia@x.co"]
    );

    expect(preview.rows.map((row) => row.errors)).toEqual([
      ["El curso «6 B» no existe. Usa uno de estos: 10 A, Club Robótica."],
      ["Falta el nombre.", "El correo no tiene un formato válido.", "La contraseña debe tener mínimo 6 caracteres.", "Falta el curso."],
      [],
      ["El correo está repetido en el archivo."],
      ["Ya hay un estudiante con este correo."]
    ]);
    expect(preview.rows.map((row) => row.row)).toEqual([2, 3, 4, 5, 6]);
  });

  it("pide la plantilla si faltan columnas", () => {
    const preview = buildImportPreview([["nombre", "correo", "curso"], ["Ana", "ana@x.co", "10 A"]], courses, []);
    expect(preview.fileError).toContain("contraseña");
  });
});

describe("getInitials", () => {
  it("returns initials from the first two words", () => {
    expect(getInitials("Ana Maria Garcia")).toBe("AM");
  });
});
