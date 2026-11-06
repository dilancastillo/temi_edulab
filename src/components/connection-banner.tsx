"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isConnected, subscribeConnection } from "@/lib/connection-status";

// En el servidor no hay navigator: se asume conexión y el cliente corrige al hidratar.
const getServerConnected = () => true;

/** true mientras hay red y el servidor responde (ver connection-status.ts). */
export function useIsOnline() {
  return useSyncExternalStore(subscribeConnection, isConnected, getServerConnected);
}

const RESTORED_VISIBLE_MS = 4000;

const errorStyle = {
  marginBottom: "1rem",
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  display: "flex",
  gap: "1rem",
  alignItems: "center",
  justifyContent: "space-between",
} as const;

// Nube de Lucide (licencia ISC), rellena en blanco; el símbolo interior toma el color del aviso.
const CLOUD_PATH = "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z";

function CloudIcon({ ok }: Readonly<{ ok: boolean }>) {
  return (
    <svg aria-hidden="true" className="connection-toast-icon" viewBox="0 0 24 24">
      <path d={CLOUD_PATH} fill="#ffffff" />
      {ok ? (
        <path d="m9.5 14 1.8 1.8 3.4-3.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      ) : (
        <path d="m10.2 11.8 3.6 3.6m0-3.6-3.6 3.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      )}
    </svg>
  );
}

/**
 * Aviso flotante de conexión: rojo mientras no hay conexión con el servidor y verde unos
 * segundos cuando vuelve. Debajo, en línea, el error de la última acción que no se pudo guardar.
 */
export function ConnectionBanner({
  offlineDetail,
  error,
  onDismissError,
}: Readonly<{ offlineDetail: string; error?: string | null; onDismissError?: () => void }>) {
  const isOnline = useIsOnline();
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setShowRestored(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowRestored(true);
    const timer = window.setTimeout(() => setShowRestored(false), RESTORED_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [isOnline]);

  return (
    <>
      <div aria-live="polite" className="connection-toast-region">
        {!isOnline ? (
          <div className="connection-toast connection-toast-offline" role="alert">
            <CloudIcon ok={false} />
            <div>
              <strong>Sin conexión con el servidor</strong>
              <span>{offlineDetail}</span>
            </div>
          </div>
        ) : showRestored ? (
          <div className="connection-toast connection-toast-online" role="status">
            <CloudIcon ok />
            <div>
              <strong>Conexión restablecida</strong>
              <span>Puede continuar trabajando con normalidad.</span>
            </div>
          </div>
        ) : null}
      </div>
      {error ? (
        <div className="form-error" role="alert" style={errorStyle}>
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
