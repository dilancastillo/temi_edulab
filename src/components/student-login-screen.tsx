"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/auth-store-provider";

export function StudentLoginScreen() {
  const router = useRouter();
  const { assignments, isReady, loginStudentWithMissionCode, loginStudentWithPassword, studentSession, students } = useDemoStore();
  const [mode, setMode] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [missionCode, setMissionCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isReady && studentSession) {
      router.replace("/estudiante");
    }
  }, [isReady, router, studentSession]);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await loginStudentWithPassword(email, password);
    if (!result.ok) {
      setError(result.message ?? "No se pudo iniciar sesión.");
      return;
    }
    router.push("/estudiante");
  }

  async function handleCodeLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await loginStudentWithMissionCode(missionCode, studentName);
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
                placeholder="Ej: AB12CD"
                required
                value={missionCode}
              />
            </label>
            <label className="field" htmlFor="student-name">
              Tu nombre completo
              <input
                id="student-name"
                maxLength={120}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="Escribe tu nombre tal como te registró el profesor"
                required
                value={studentName}
              />
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
