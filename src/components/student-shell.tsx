"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/auth-store-provider";
import { UnsavedChangesProvider, useUnsavedChanges } from "@/components/unsaved-changes-provider";
import { ConnectionBanner } from "@/components/connection-banner";
import { getInitials } from "@/lib/csv";

// Íconos de contorno (trazos de Lucide, licencia ISC).
function NavIcon({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

const studentNavItems = [
  {
    href: "/estudiante",
    label: "Inicio",
    icon: (
      <NavIcon>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M10 21v-6h4v6" />
      </NavIcon>
    )
  },
  {
    href: "/estudiante/juego-libre",
    label: "Juego libre",
    icon: (
      <NavIcon>
        <path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z" />
      </NavIcon>
    )
  }
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
  const { isReady, logout, studentSession, studentTeacher, students } = useDemoStore();
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

  const studentEmail = students.find((s) => s.id === studentSession.studentId)?.email;

  return (
    <div className="student-shell">
      <header className="student-topbar">
        <button
          aria-label="Ir al inicio estudiante"
          className="student-brand"
          onClick={() => requestNavigation(() => router.push("/estudiante"))}
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ic_logo.png" alt="" />
          <span className="student-brand-name">Esbot EduLab</span>
        </button>
        <nav aria-label="Navegación estudiante" className="student-nav">
          <ul className="student-nav-list">
            {studentNavItems.map((item) => (
              <li key={item.href}>
                <button
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="student-nav-link"
                  onClick={() => requestNavigation(() => router.push(item.href))}
                  type="button"
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="student-user">
          <StudentAccountMenu email={studentEmail} name={studentSession.displayName} teacher={studentTeacher} />
          <button
            aria-label="Salir"
            className="student-logout"
            title="Salir"
            onClick={() => requestNavigation(() => { void logout("student"); router.replace("/estudiante/login"); })}
            type="button"
          >
            <NavIcon>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </NavIcon>
          </button>
        </div>
      </header>
      <main className="student-content">
        <ConnectionBanner offlineDetail="Tu trabajo se guarda en este equipo y se enviará cuando vuelva la conexión." />
        {children}
        <p className="app-copyright">© 2026 All Rights Reserved.</p>
      </main>
    </div>
  );
}

/**
 * Avatar y nombre del estudiante. Al hacer clic se despliega a qué docente pertenece,
 * para saberlo sin entrar a revisar cada cuenta de docente.
 */
function StudentAccountMenu({
  name,
  email,
  teacher,
}: Readonly<{ name: string; email?: string; teacher: { fullName: string; email: string } | null }>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="student-account" ref={rootRef}>
      <button
        aria-controls="student-account-panel"
        aria-expanded={open}
        className="student-account-trigger"
        onClick={() => setOpen((current) => !current)}
        title="Ver mi docente"
        type="button"
      >
        <span aria-hidden="true" className="student-avatar">{getInitials(name)}</span>
        <span className="student-user-copy">
          <strong>{name}</strong>
          {email ? <small>{email}</small> : null}
        </span>
      </button>
      {open ? (
        <div className="student-account-panel" id="student-account-panel" role="region" aria-label="Mi docente">
          <span className="student-account-label">Docente</span>
          {teacher ? (
            <>
              {teacher.fullName ? <strong>{teacher.fullName}</strong> : null}
              <span>{teacher.email}</span>
            </>
          ) : (
            <span>No se pudo cargar el docente.</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

