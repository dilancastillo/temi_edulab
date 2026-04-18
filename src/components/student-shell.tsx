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
          <LogoMark />
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
