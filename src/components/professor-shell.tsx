"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/demo-store-provider";

const navItems = [
  { href: "/profesor", label: "Inicio" },
  { href: "/profesor/estudiantes", label: "Estudiantes" },
  { href: "/profesor/biblioteca", label: "Biblioteca" },
  { href: "/profesor/misiones", label: "Misiones en curso" },
  { href: "/profesor/configuracion", label: "Configuracion" }
] as const;

export function ProfessorShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, logout, profile, session } = useDemoStore();

  useEffect(() => {
    if (isReady && !session) {
      router.replace("/login");
      return;
    }
    if (isReady && session?.role !== "teacher") {
      router.replace("/estudiante");
    }
  }, [isReady, router, session]);

  if (!isReady || !session || session.role !== "teacher") {
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
          <span className="avatar avatar-small">{profile.fullName.slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>{profile.fullName}</strong>
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
          Cerrar sesion
        </button>
      </aside>
      <main className="content-shell" id="main-content">
        {children}
      </main>
    </div>
  );
}
