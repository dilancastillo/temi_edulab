"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { useAuthStore } from "@/components/auth-store-provider";

export function LoginScreen() {
  const router = useRouter();
  const { isReady, loginWithPassword, session, teacherId } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isReady && teacherId) {
      router.replace("/profesor");
    }
  }, [isReady, router, teacherId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const result = await loginWithPassword(email, password);

    if (!result.ok) {
      setError(result.message ?? "No se pudo iniciar sesión.");
    }
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
          <p className="eyebrow">Acceso local</p>
          <h2 id="login-title">Iniciar sesión</h2>
          <p className="muted">Usa la cuenta demo o entra en modo local.</p>
        </div>
        <form className="form-stack" onSubmit={handleSubmit} method="post" action="#">
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
            <label htmlFor="password">Contraseña</label>
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
            Iniciar sesión
          </button>
        </form>
        {/* TODO: Implementar login con Google en el futuro */}
        {/* <div className="provider-grid" aria-label="Opciones de acceso">
          <div className="google-button-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="100%"
            />
          </div>
        </div> */}
        <Link className="text-link" href="/estudiante/login">
          Entrar como estudiante
        </Link>
      </section>
    </main>
  );
}
