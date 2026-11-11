"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type RowAction = {
  label: string;
  /** Se abre en una pestaña nueva (por ejemplo el reporte imprimible). */
  href?: string;
  onSelect?: () => void;
  tone?: "default" | "danger";
};

/**
 * Botón de tres puntos con un menú desplegable de acciones para una fila de tabla.
 * Se cierra al elegir una acción, al hacer clic afuera o con Escape.
 */
export function RowActionsMenu({ actions, label = "Más acciones" }: Readonly<{ actions: RowAction[]; label?: string }>) {
  const [open, setOpen] = useState(false);
  // Posición fija en la ventana: la tabla tiene scroll horizontal y recortaría un menú absoluto.
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 6, left: rect.left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    // Si la página o la tabla se desplazan, el menú ya no estaría junto al botón: se cierra.
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div className="row-menu" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="row-menu-trigger"
        onClick={toggle}
        ref={triggerRef}
        title={label}
        type="button"
      >
        <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && position ? (
        <div className="row-menu-panel" role="menu" style={{ top: position.top, left: position.left }}>
          {actions.map((action) => {
            const className = `row-menu-item${action.tone === "danger" ? " row-menu-item-danger" : ""}`;
            if (action.href) {
              return (
                <Link
                  className={className}
                  href={action.href}
                  key={action.label}
                  onClick={() => setOpen(false)}
                  rel="noopener"
                  role="menuitem"
                  target="_blank"
                >
                  {action.label}
                </Link>
              );
            }
            return (
              <button
                className={className}
                key={action.label}
                onClick={() => {
                  setOpen(false);
                  action.onSelect?.();
                }}
                role="menuitem"
                type="button"
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
