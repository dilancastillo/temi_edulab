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
  const { isReady, logout, profile, session, teacherId } = useDemoStore();

  useEffect(() => {
    // Redirigir solo si ya está listo Y no hay sesión de docente
    // No redirigir si isReady es true pero teacherId aún no se ha cargado
    if (isReady && !session && !teacherId) {
      router.replace("/login");
    }
  }, [isReady, router, session, teacherId]);

  // Mostrar loading solo si NO está listo, O si está listo pero no hay sesión ni teacherId
  if (!isReady || (isReady && !session && !teacherId)) {
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
        <LogoMark subtitle={profile?.fullName ?? "Docente"} />
        {/* sidebar-user oculto — el nombre del docente se muestra en el logo
        <div className="sidebar-user">
          <span className="avatar avatar-small">{(profile?.fullName ?? "??").slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>{profile?.fullName ?? "Docente"}</strong>
            <small>Profesor</small>
          </span>
        </div>
        */}
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
          onClick={() => { void logout(); }}
          type="button"
        >
          Cerrar sesión
        </button>
      </aside>
      <main className="content-shell" id="main-content">
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.75rem", padding: "1rem 1.5rem 0", pointerEvents: "none" }} aria-hidden="true">
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.3 }}>
            <strong style={{ fontSize: "0.75rem" }}>{profile?.fullName ?? "Docente"}</strong>
            <small style={{ fontSize: "0.65rem", opacity: 0.65 }}>Docente</small>
          </span>
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={profile.fullName}
              src={profile.avatarUrl}
              style={{ width: "1.75rem", height: "1.75rem", borderRadius: "50%", objectFit: "cover", flexShrink: 0, pointerEvents: "none" }}
            />
          ) : (
            <span className="avatar avatar-small" style={{ width: "1.75rem", height: "1.75rem", fontSize: "0.65rem" }}>{(profile?.fullName ?? "??").slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        {children}
        <p className="app-copyright">© 2026 All Rights Reserved.</p>
      </main>
    </div>
  );
}
