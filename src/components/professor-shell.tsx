"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/auth-store-provider";

const navItems = [
  { href: "/profesor", label: "Inicio" },
  { href: "/profesor/estudiantes", label: "Estudiantes" },
  { href: "/profesor/biblioteca", label: "Biblioteca" },
  { href: "/profesor/misiones", label: "Misiones en curso" },
  { href: "/profesor/configuracion", label: "Configuración" }
] as const;

export function ProfessorShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, logout, profile, teacherId } = useDemoStore();

  useEffect(() => {
    if (isReady && !teacherId) {
      router.replace("/login");
    }
  }, [isReady, router, teacherId]);

  if (!isReady || !teacherId) {
    return (
      <main className="loading-screen" aria-live="polite">
        <LogoMark />
        <p>Cargando el panel docente...</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegacion principal">
        <LogoMark />
        <div className="sidebar-user">
          <span className="avatar avatar-small">{(profile?.fullName ?? "??").slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>{profile?.fullName ?? "Docente"}</strong>
            <small>Profesor</small>
          </span>
        </div>
        <nav>
          <ul className="nav-list">
            {navItems.map((item) => {
              const isActive = item.href === "/profesor" ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link aria-current={isActive ? "page" : undefined} className="nav-link" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button
          className="nav-link nav-link-button"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </aside>
      <main className="content-shell" id="main-content">
        {children}
      </main>
    </div>
  );
}
