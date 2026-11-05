"use client";

import type { SaveStatus } from "@/components/use-work-autosave";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Estado del guardado en una sola línea de texto, sin caja ni fondo, debajo de los botones.
 * La explicación larga de "sin conexión" la da el aviso superior (ConnectionBanner).
 */
export function SaveStatusIndicator({
  status,
  lastSavedAt,
  errorMessage,
}: Readonly<{ status: SaveStatus; lastSavedAt: number | null; errorMessage: string }>) {
  let text: string;
  let isAlert = false;

  switch (status) {
    case "saving":
      text = "Guardando…";
      break;
    case "dirty":
      text = "Cambios sin guardar…";
      break;
    case "offline":
      text = "Sin conexión: guardado en este dispositivo";
      isAlert = true;
      break;
    case "error":
      text = "No se pudo guardar, reintentando…";
      isAlert = true;
      break;
    default:
      text = lastSavedAt ? `Guardado a las ${formatTime(lastSavedAt)}` : "Todo guardado";
  }

  return (
    <p
      aria-live="polite"
      role="status"
      style={{
        margin: 0,
        // Lo acerca al borde inferior de .editor-header-card, cuyo padding es clamp(1.25rem, 4vw, 2rem):
        // queda a 0.4rem del borde en cualquier tamaño de pantalla.
        marginBottom: "calc(0.4rem - clamp(1.25rem, 4vw, 2rem))",
        fontSize: "0.875rem",
        whiteSpace: "nowrap",
        ...(isAlert ? { color: "#b42318" } : null),
      }}
      title={status === "error" && errorMessage ? errorMessage : undefined}
    >
      {text}
    </p>
  );
}
