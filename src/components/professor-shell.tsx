"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/auth-store-provider";
import { ConnectionBanner } from "@/components/connection-banner";

// Íconos de contorno (trazos de Lucide, licencia ISC).
function NavIcon({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <svg aria-hidden="true" className="nav-link-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

const navItems = [
  {
    href: "/profesor",
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
    href: "/profesor/estudiantes",
    label: "Estudiantes",
    icon: (
      <NavIcon>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </NavIcon>
    )
  },
  {
    href: "/profesor/biblioteca",
    label: "Biblioteca",
    icon: (
      <NavIcon>
        <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2" />
        <path d="M8 7h7" />
        <path d="M8 11h5" />
      </NavIcon>
    )
  },
  {
    href: "/profesor/misiones",
    label: "Misiones en curso",
    icon: (
      <NavIcon>
        <path d="M4 22V4" />
        <path d="M4 4h12l-2 4 2 4H4" />
      </NavIcon>
    )
  },
  {
    href: "/profesor/configuracion",
    label: "Configuración",
    icon: (
      <NavIcon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </NavIcon>
    )
  }
] as const;

export function ProfessorShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, logout, profile, session, teacherId, syncError, clearSyncError } = useDemoStore();

  useEffect(() => {
    // Redirigir solo si ya está listo Y no hay sesión de docente
    // No redirigir si isReady es true pero teacherId aún no se ha cargado
    if (isReady && !session && !teacherId) {
      router.replace("/login");
    }
  }, [isReady, router, session, teacherId]);

  // El reporte imprimible se muestra sin la barra lateral ni el encabezado.
  const isReportRoute = pathname.startsWith("/profesor/reporte");

  // Mostrar loading solo si NO está listo, O si está listo pero no hay sesión ni teacherId
  if (!isReady || (isReady && !session && !teacherId)) {
    return (
      <main className="loading-screen" aria-live="polite">
        <LogoMark />
        <p>Cargando el panel docente...</p>
      </main>
    );
  }

  if (isReportRoute) {
    return <>{children}</>;
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
                    {item.icon}
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
        <ConnectionBanner
          error={syncError}
          offlineDetail="Los cambios no se guardarán hasta que vuelva la conexión."
          onDismissError={clearSyncError}
        />
        {children}
        <p className="app-copyright">© 2026 All Rights Reserved.</p>
      </main>
    </div>
  );
}
