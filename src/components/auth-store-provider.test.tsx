import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El cliente de Supabase se crea al importar el módulo y necesita variables de entorno.
vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

import { AuthStoreProvider, useAuthStore } from "./auth-store-provider";

const teacherStudents = ["s1", "s2", "s3"].map((id) => ({
  id,
  teacherId: "t1",
  institutionId: "inst-esbot",
  courseId: "course-10a",
  fullName: `Estudiante ${id}`,
  email: `${id}@test.co`,
  password: "",
  progress: "En curso",
  createdAt: "2026-11-01T00:00:00.000Z",
}));

function StoreProbe() {
  const { isReady, students } = useAuthStore();
  return <p data-testid="probe">{isReady ? `listo:${students.length}` : "cargando"}</p>;
}

function mockApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/teacher/data")) {
        return new Response(
          JSON.stringify({ ok: true, students: teacherStudents, assignments: [], studentWorks: [], missions: [], profile: { id: "t1", teacherId: "t1", fullName: "Docente", email: "d@test.co", biography: "", institutionId: "inst-esbot" } }),
          { status: 200 }
        );
      }
      if (url.startsWith("/api/student/data")) {
        return new Response(
          JSON.stringify({ ok: true, student: { id: "s9", teacher_id: "t2", course_id: "course-10b", full_name: "Otro", email: "o@test.co" }, assignments: [], studentWorks: [], missions: [], robotId: null }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 404 });
    })
  );
}

beforeEach(() => {
  window.localStorage.clear();
  mockApi();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, "", "/");
});

describe("AuthStoreProvider: sesión de docente y de estudiante en el mismo navegador", () => {
  it("el directorio del docente no se reemplaza por el estudiante que inició sesión en otra pestaña", async () => {
    // Una sesión de estudiante vigente quedó en localStorage (compartido entre pestañas).
    window.localStorage.setItem(
      "esbot.studentSession.v1",
      JSON.stringify({ studentId: "s9", displayName: "Otro", teacherId: "t2", expiresAt: Date.now() + 60_000 })
    );
    window.history.pushState({}, "", "/profesor/estudiantes");

    render(
      <AuthStoreProvider>
        <StoreProbe />
      </AuthStoreProvider>
    );

    await waitFor(() => expect(screen.getByTestId("probe").textContent).toMatch(/^listo/));
    expect(screen.getByTestId("probe").textContent).toBe("listo:3");
  });

  it("en el área del estudiante se restaura su sesión y no se cargan los datos del docente", async () => {
    window.localStorage.setItem(
      "esbot.studentSession.v1",
      JSON.stringify({ studentId: "s9", displayName: "Otro", teacherId: "t2", expiresAt: Date.now() + 60_000 })
    );
    window.history.pushState({}, "", "/estudiante");

    render(
      <AuthStoreProvider>
        <StoreProbe />
      </AuthStoreProvider>
    );

    await waitFor(() => expect(screen.getByTestId("probe").textContent).toMatch(/^listo/));
    expect(screen.getByTestId("probe").textContent).toBe("listo:1");
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(urls.some((u) => u.startsWith("/api/teacher/data"))).toBe(false);
  });
});
