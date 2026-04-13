"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/demo-store-provider";

export function LoginScreen() {
  const router = useRouter();
  const { isReady, loginWithPassword, loginWithProvider, session } = useDemoStore();
  const [email, setEmail] = useState("profesor@esbot.test");
  const [password, setPassword] = useState("demo2026");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isReady && session?.role === "teacher") {
      router.replace("/profesor");
    } else if (isReady && session?.role === "student") {
      router.replace("/estudiante");
    }
  }, [isReady, router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await loginWithPassword(email, password);

    if (!result.ok) {
      setError(result.message ?? "No se pudo iniciar sesion.");
      return;
    }

    router.push("/profesor");
  }

  function handleProvider(provider: "google" | "microsoft") {
    const result = loginWithProvider(provider);

    if (!result.ok) {
      setError(result.message ?? "No se pudo iniciar sesion.");
      return;
    }

    router.push("/profesor");
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-label="Presentacion">
        <div>
          <p className="eyebrow">Panel docente</p>
          <h1>Bienvenido de nuevo</h1>
          <p>Gestiona tus grupos, asigna misiones y revisa el avance de tus estudiantes.</p>
        </div>
      </section>
      <section className="login-card" aria-labelledby="login-title">
        <LogoMark />
        <div>
          <p className="eyebrow">Acceso seguro</p>
          <h2 id="login-title">Iniciar sesion</h2>
          <p className="muted">Usa tu cuenta docente. Google y Microsoft quedaran listos cuando registremos las credenciales OAuth reales.</p>
        </div>
        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Correo institucional</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contrasena</label>
            <input
              autoComplete="current-password"
              id="password"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button button-primary button-full" type="submit">
            Iniciar sesion
          </button>
        </form>
        <div className="provider-grid" aria-label="Opciones de acceso">
          <button className="button button-secondary" onClick={() => handleProvider("google")} type="button">
            Continuar con Google
          </button>
          <button className="button button-secondary" onClick={() => handleProvider("microsoft")} type="button">
            Continuar con Microsoft
          </button>
        </div>
        <Link className="text-link" href="/estudiante/login">
          Entrar como estudiante
        </Link>
        <p className="hint">La sesion web viaja por cookie segura desde el backend compartido.</p>
      </section>
    </main>
  );
}
