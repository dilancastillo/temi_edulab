"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/demo-store-provider";

const navItems = [{ href: "/institucion", label: "Centro institucional" }] as const;

export function InstitutionShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { institution, isReady, logout, profile, session } = useDemoStore();
  const canAccess = session?.role === "institution_admin" || session?.role === "admin";

  useEffect(() => {
    if (!isReady) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canAccess) {
      router.replace(session.role === "student" ? "/estudiante" : "/profesor");
    }
  }, [canAccess, isReady, router, session]);

  if (!isReady || !session || !canAccess) {
    return (
      <main className="loading-screen" aria-live="polite">
        <LogoMark />
        <p>Cargando el centro institucional...</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegacion institucional">
        <LogoMark />
        <div className="sidebar-user">
          <span className="avatar avatar-small">{profile.fullName.slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>{profile.fullName}</strong>
            <small>{institution.name || "Institucion"}</small>
          </span>
        </div>
        <nav>
          <ul className="nav-list">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

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
        <Link className="nav-link" href="/profesor">
          Ver panel docente
        </Link>
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
