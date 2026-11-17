"use client";

import Link from "next/link";

type RowAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type IconAction = RowAction & {
  icon: "book" | "archive" | "close" | "restore";
  tone?: "default" | "danger";
};

type AssignmentRowProps = {
  /** Ícono de la misión con el fondo del color de la misión (redondo). */
  icon: { src?: string; emoji?: string; tone: string };
  title: string;
  subtitle: string;
  /** Columnas de datos: valor arriba y etiqueta pequeña abajo. */
  stats: { value: string; label: string }[];
  primary?: RowAction;
  /** Acción secundaria como texto azul, sin fondo ni borde. */
  secondary?: RowAction;
  iconActions?: IconAction[];
};

/** "5 nov 2026" */
export function formatAssignedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const ICONS: Record<IconAction["icon"], React.ReactNode> = {
  book: (
    <>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2" />
      <path d="M8 7h7" />
    </>
  ),
  archive: (
    <>
      <rect height="5" rx="1" width="18" x="3" y="3" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </>
  ),
  restore: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
};

/**
 * Fila de una misión en curso, con aspecto de tabla: código, misión y curso, datos con
 * su etiqueta debajo, una acción principal y acciones secundarias como botones redondos.
 */
export function AssignmentRow({ icon, title, subtitle, stats, primary, secondary, iconActions = [] }: Readonly<AssignmentRowProps>) {
  return (
    <article className="assignment-row">
      <span aria-hidden="true" className={`assignment-row-icon-badge mission-symbol-${icon.tone}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {icon.src ? <img alt="" src={icon.src} /> : <span>{icon.emoji}</span>}
      </span>
      <div className="assignment-row-main">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
      {stats.map((stat) => (
        <div className="assignment-row-stat" key={stat.label}>
          <strong>{stat.value}</strong>
          <small>{stat.label}</small>
        </div>
      ))}
      <div className="assignment-row-actions">
        {primary ? (
          primary.href ? (
            <Link className="assignment-row-primary" href={primary.href}>
              {primary.label}
            </Link>
          ) : (
            <button className="assignment-row-primary" onClick={primary.onClick} type="button">
              {primary.label}
            </button>
          )
        ) : null}
        {secondary ? (
          secondary.href ? (
            <Link className="assignment-row-link" href={secondary.href}>
              {secondary.label}
            </Link>
          ) : (
            <button className="assignment-row-link" onClick={secondary.onClick} type="button">
              {secondary.label}
            </button>
          )
        ) : null}
        {iconActions.map((action) => {
          const className = `assignment-row-icon${action.tone === "danger" ? " assignment-row-icon-danger" : ""}`;
          const svg = (
            <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
              {ICONS[action.icon]}
            </svg>
          );
          return action.href ? (
            <Link aria-label={action.label} className={className} href={action.href} key={action.label} title={action.label}>
              {svg}
            </Link>
          ) : (
            <button aria-label={action.label} className={className} key={action.label} onClick={action.onClick} title={action.label} type="button">
              {svg}
            </button>
          );
        })}
      </div>
    </article>
  );
}
