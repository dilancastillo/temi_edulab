import { describe, expect, it } from "vitest";
import { getInitials, parseStudentsCsv } from "@/lib/csv";

describe("parseStudentsCsv", () => {
  it("parses students with spanish headers", () => {
    const result = parseStudentsCsv("nombre,correo,curso\nAna Garcia,ana@example.com,10 A\nCamilo Lopez,camilo@example.com,10 B");

    expect(result.errors).toEqual([]);
    expect(result.students).toEqual([
      { fullName: "Ana Garcia", email: "ana@example.com", courseName: "10 A" },
      { fullName: "Camilo Lopez", email: "camilo@example.com", courseName: "10 B" }
    ]);
  });

  it("reports invalid rows and duplicate emails", () => {
    const result = parseStudentsCsv("nombre,correo,curso\nAna,ana@example.com,10 A\nLuis,no-es-correo,10 A\nAna 2,ana@example.com,10 B");

    expect(result.students).toEqual([{ fullName: "Ana", email: "ana@example.com", courseName: "10 A" }]);
    expect(result.errors).toEqual([
      "Fila 3: el correo no tiene un formato válido.",
      "Fila 4: el correo ana@example.com está duplicado en el archivo."
    ]);
  });
});

describe("getInitials", () => {
  it("returns initials from the first two words", () => {
    expect(getInitials("Ana Maria Garcia")).toBe("AM");
  });
});
