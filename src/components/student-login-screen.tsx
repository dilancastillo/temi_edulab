"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/demo-store-provider";

export function StudentLoginScreen() {
  const router = useRouter();
  const { isReady, loginStudentWithMissionCode, loginStudentWithPassword, session } = useDemoStore();
  const [mode, setMode] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("ana.garcia@esbot.test");
  const [password, setPassword] = useState("estudiante2026");
  const [missionCode, setMissionCode] = useState("SGKRBY");
  const [studentEmail, setStudentEmail] = useState("ana.garcia@esbot.test");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isReady && session?.role === "student") {
      router.replace("/estudiante");
    }
  }, [isReady, router, session]);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await loginStudentWithPassword(email, password);

    if (!result.ok) {
      setError(result.message ?? "No se pudo iniciar sesion.");
      return;
    }

    router.push("/estudiante");
  }

  async function handleCodeLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await loginStudentWithMissionCode(missionCode, studentEmail);

    if (!result.ok) {
      setError(result.message ?? "No se pudo entrar con ese codigo.");
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
          <h1 id="student-login-title">Elige como entrar</h1>
          <p>Continua tu mision, prueba bloques y envia tu solucion cuando este lista.</p>
        </div>

        <div className="segmented-control" aria-label="Metodo de acceso">
          <button aria-pressed={mode === "email"} className="segment-button" onClick={() => setMode("email")} type="button">
            Correo
          </button>
          <button aria-pressed={mode === "code"} className="segment-button" onClick={() => setMode("code")} type="button">
            Codigo de mision
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
              Contrasena
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
              Codigo de mision
              <input
                id="mission-code"
                maxLength={12}
                onChange={(event) => setMissionCode(event.target.value.toUpperCase())}
                required
                value={missionCode}
              />
            </label>
            <label className="field" htmlFor="student-email-code">
              Correo del estudiante
              <input
                autoComplete="email"
                id="student-email-code"
                onChange={(event) => setStudentEmail(event.target.value)}
                required
                type="email"
                value={studentEmail}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="button button-primary button-full" type="submit">
              Entrar a la mision
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
