/**
 * Estado de la conexión con el servidor, compartido por toda la app (docente y estudiante).
 *
 * navigator.onLine solo dice si el equipo tiene red; con un internet malo suele seguir en
 * "true" aunque nada llegue al servidor. Por eso, además de los eventos online/offline,
 * se consulta /api/health cada cierto tiempo y cualquier petición que no llegue al servidor
 * (ver api-client) marca la conexión como caída.
 */

const PING_INTERVAL_MS = 15_000;
const PING_TIMEOUT_MS = 6_000;

let serverReachable = true;
const listeners = new Set<() => void>();
let stopMonitor: (() => void) | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

/** Lo llaman las peticiones a /api según si llegaron o no al servidor. */
export function reportServerReachable(reachable: boolean) {
  if (serverReachable === reachable) return;
  serverReachable = reachable;
  emit();
}

export function isConnected(): boolean {
  const browserOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  return browserOnline && serverReachable;
}

async function ping() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    emit();
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const response = await fetch("/api/health", { cache: "no-store", signal: controller.signal });
    reportServerReachable(response.ok);
  } catch {
    reportServerReachable(false);
  } finally {
    clearTimeout(timer);
  }
}

function startMonitor() {
  const onNetworkChange = () => {
    emit();
    void ping();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") void ping();
  };
  window.addEventListener("online", onNetworkChange);
  window.addEventListener("offline", onNetworkChange);
  document.addEventListener("visibilitychange", onVisible);
  const interval = window.setInterval(() => {
    if (document.visibilityState === "visible") void ping();
  }, PING_INTERVAL_MS);

  return () => {
    window.removeEventListener("online", onNetworkChange);
    window.removeEventListener("offline", onNetworkChange);
    document.removeEventListener("visibilitychange", onVisible);
    window.clearInterval(interval);
  };
}

/** Suscripción para useSyncExternalStore: el monitor solo corre mientras alguien escucha. */
export function subscribeConnection(listener: () => void) {
  listeners.add(listener);
  if (!stopMonitor) stopMonitor = startMonitor();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stopMonitor) {
      stopMonitor();
      stopMonitor = null;
    }
  };
}
