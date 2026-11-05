"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getOnline = () => navigator.onLine;
// En el servidor no hay navigator: se asume conexión y el cliente corrige al hidratar.
const getServerOnline = () => true;

export function useIsOnline() {
  return useSyncExternalStore(subscribe, getOnline, getServerOnline);
}

const bannerStyle = {
  margin: "0 1.5rem 1rem",
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  display: "flex",
  gap: "1rem",
  alignItems: "center",
  justifyContent: "space-between",
} as const;

/**
 * Aviso visible cuando el navegador pierde la conexión y, opcionalmente,
 * el error de la última acción que no se pudo guardar en el servidor.
 */
export function ConnectionBanner({
  offlineMessage,
  error,
  onDismissError,
}: Readonly<{ offlineMessage: string; error?: string | null; onDismissError?: () => void }>) {
  const isOnline = useIsOnline();

  return (
    <>
      {!isOnline ? (
        <div className="form-error" role="alert" style={bannerStyle}>
          <span>{offlineMessage}</span>
        </div>
      ) : null}
      {error ? (
        <div className="form-error" role="alert" style={bannerStyle}>
          <span>{error}</span>
          {onDismissError ? (
            <button className="button button-ghost" onClick={onDismissError} type="button">
              Cerrar
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
