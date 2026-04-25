"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/auth-store-provider";
import { UnsavedChangesProvider, useUnsavedChanges } from "@/components/unsaved-changes-provider";

const studentNavItems = [
  { href: "/estudiante", label: "Inicio" },
  { href: "/estudiante/juego-libre", label: "Juego libre" }
] as const;

export function StudentShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <UnsavedChangesProvider>
      <StudentShellInner>{children}</StudentShellInner>
    </UnsavedChangesProvider>
  );
}

function StudentShellInner({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, logout, studentSession } = useDemoStore();
  const { requestNavigation } = useUnsavedChanges();
  const isLoginRoute = pathname === "/estudiante/login";

  useEffect(() => {
    if (isLoginRoute) return;
    if (!isReady) return;
    if (!studentSession) {
      router.replace("/estudiante/login");
    }
  }, [isLoginRoute, isReady, router, studentSession]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!isReady || !studentSession) {
    return (
      <main className="loading-screen" aria-live="polite">
        <LogoMark />
        <p>Cargando tu espacio de aprendizaje...</p>
      </main>
    );
  }

  return (
    <div className="student-shell">
      <header className="student-topbar">
        <button
          aria-label="Ir al inicio estudiante"
          className="button-reset"
          onClick={() => requestNavigation(() => router.push("/estudiante"))}
          type="button"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <div className="brand-lockup" aria-label="Esbot EduLab">
            <span className="brand-mark" aria-hidden="true" style={{ background: "none", border: "none", boxShadow: "none", padding: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ic_logo.png" alt="Logo" style={{ width: "2.8rem", height: "2.8rem", objectFit: "contain", display: "block" }} />
            </span>
            <span className="brand-copy" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "0", lineHeight: "1.2" }}>
              <strong style={{ fontSize: "1.1rem", lineHeight: "1.2", textAlign: "left" }}>Esbot EduLab</strong>
              <small style={{ fontSize: "0.8rem", lineHeight: "1.2", opacity: 0.85, textAlign: "left" }}>{studentSession.displayName}</small>
            </span>
          </div>
        </button>
        <nav aria-label="Navegación estudiante">
          <ul className="student-nav-list">
            {studentNavItems.map((item) => (
              <li key={item.href}>
                <button
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="student-nav-link"
                  onClick={() => requestNavigation(() => router.push(item.href))}
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <button
          className="button button-secondary topbar-action"
          onClick={() => requestNavigation(() => { void logout(); router.replace("/estudiante/login"); })}
          type="button"
        >
          Salir
        </button>
      </header>
      <main className="student-content">{children}</main>
    </div>
  );
}
