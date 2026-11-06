"use client";

import { useState, type SelectHTMLAttributes } from "react";

/**
 * Lista desplegable nativa con una flecha que apunta hacia arriba mientras la lista
 * está abierta y hacia abajo cuando se cierra (el navegador no avisa cuándo se abre,
 * por eso se sigue con el mouse, el teclado, el cambio de valor y la pérdida de foco).
 */
export function ChevronSelect({
  className,
  onBlur,
  onChange,
  onKeyDown,
  onMouseDown,
  ...props
}: Readonly<SelectHTMLAttributes<HTMLSelectElement>>) {
  const [open, setOpen] = useState(false);

  return (
    <span className={`chevron-select${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}>
      <select
        {...props}
        onBlur={(event) => {
          setOpen(false);
          onBlur?.(event);
        }}
        onChange={(event) => {
          setOpen(false);
          onChange?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" || event.key === "Tab" || event.key === "Enter") setOpen(false);
          else if (event.key === " " || (event.altKey && event.key === "ArrowDown")) setOpen(true);
          onKeyDown?.(event);
        }}
        onMouseDown={(event) => {
          setOpen((current) => !current);
          onMouseDown?.(event);
        }}
      />
      <svg aria-hidden="true" className="chevron-select-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} viewBox="0 0 24 24">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  );
}
