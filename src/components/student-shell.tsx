"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoMark } from "@/components/logo";
import { useDemoStore } from "@/components/demo-store-provider";

const studentNavItems = [
  { href: "/estudiante", label: "Inicio" },
  { href: "/estudiante/juego-libre", label: "Juego libre" }
] as const;

export function StudentShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, logout, session } = useDemoStore();
  const isLoginRoute = pathname === "/estudiante/login";

  useEffect(() => {
    if (isLoginRoute) return;
    if (!isReady) return;
    if (!session) {
      router.replace("/estudiante/login");
      return;
    }
    if (session.role !== "student") {
      router.replace(session.role === "teacher" ? "/profesor" : "/institucion");
    }
  }, [isLoginRoute, isReady, router, session]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!isReady || !session || session.role !== "student") {
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
        <Link href="/estudiante" aria-label="Ir al inicio estudiante">
          <LogoMark />
        </Link>
        <nav aria-label="Navegacion estudiante">
          <ul className="student-nav-list">
            {studentNavItems.map((item) => (
              <li key={item.href}>
                <Link aria-current={pathname === item.href ? "page" : undefined} className="student-nav-link" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <button
          className="button button-secondary topbar-action"
          onClick={async () => {
            await logout();
            router.replace("/estudiante/login");
          }}
          type="button"
        >
          Salir
        </button>
      </header>
      <main className="student-content">{children}</main>
    </div>
  );
}
