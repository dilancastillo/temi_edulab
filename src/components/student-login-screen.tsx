"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/demo-store-provider";

export function StudentLoginScreen() {
  const router = useRouter();
  const { assignments, isReady, loginStudentWithMissionCode, loginStudentWithPassword, session, students } = useDemoStore();
  const [mode, setMode] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("ana.garcia@esbot.test");
  const [password, setPassword] = useState("estudiante2026");
  const [missionCode, setMissionCode] = useState(assignments[0]?.missionCode ?? "SGKRBY");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [error, setError] = useState("");

  const activeStudents = useMemo(
    () => students.filter((student) => assignments.some((assignment) => assignment.status === "active" && assignment.courseId === student.courseId)),
    [assignments, students]
  );
  const selectedStudentId = studentId || activeStudents[0]?.id || "";

  useEffect(() => {
    if (isReady && session?.role === "student") {
      router.replace("/estudiante");
    }
  }, [isReady, router, session]);

  function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = loginStudentWithPassword(email, password);

    if (!result.ok) {
      setError(result.message ?? "No se pudo iniciar sesión.");
      return;
    }

    router.push("/estudiante");
  }

  function handleCodeLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = loginStudentWithMissionCode(missionCode, selectedStudentId);

    if (!result.ok) {
      setError(result.message ?? "No se pudo entrar con ese código.");
      return;
    }

    router.push("/estudiante");
  }

  return (
    <main className="student-login-page">
      <section className="student-login-card" aria-labelledby="student-login-title">
        <LogoMark />
        <div>
          <p className="eyebrow">Espacio estudiante</p>
          <h1 id="student-login-title">Elige cómo entrar</h1>
          <p>Continúa tu misión, prueba bloques y envía tu solución cuando esté lista.</p>
        </div>

        <div className="segmented-control" aria-label="Método de acceso">
          <button aria-pressed={mode === "email"} className="segment-button" onClick={() => setMode("email")} type="button">
            Correo
          </button>
          <button aria-pressed={mode === "code"} className="segment-button" onClick={() => setMode("code")} type="button">
            Código de misión
          </button>
        </div>

        {mode === "email" ? (
          <form className="form-stack" onSubmit={handleEmailLogin}>
            <label className="field" htmlFor="student-email">
              Correo
              <input
                autoComplete="email"
                id="student-email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className="field" htmlFor="student-password">
              Contraseña
              <input
                autoComplete="current-password"
                id="student-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="button button-primary button-full" type="submit">
              Entrar
            </button>
          </form>
        ) : (
          <form className="form-stack" onSubmit={handleCodeLogin}>
            <label className="field" htmlFor="mission-code">
              Código de misión
              <input
                id="mission-code"
                maxLength={12}
                onChange={(event) => setMissionCode(event.target.value.toUpperCase())}
                required
                value={missionCode}
              />
            </label>
            <label className="field" htmlFor="student-selector">
              Soy
              <select id="student-selector" onChange={(event) => setStudentId(event.target.value)} required value={selectedStudentId}>
                {activeStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="button button-primary button-full" type="submit">
              Entrar a la misión
            </button>
          </form>
        )}

        <Link className="text-link" href="/login">
          Entrar como profesor
        </Link>
      </section>
    </main>
  );
}
