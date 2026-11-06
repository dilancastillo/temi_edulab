/**
 * Cliente mínimo para las rutas /api de la app.
 *
 * Nunca lanza excepciones: siempre devuelve un resultado que distingue
 * "sin conexión" (la petición no llegó al servidor) de "el servidor respondió con error",
 * para que la interfaz pueda decir la verdad al usuario en vez de asumir que todo se guardó.
 */

import { reportServerReachable } from "@/lib/connection-status";

export type ApiSuccess = { ok: true; data: Record<string, unknown> };
export type ApiFailure = { ok: false; offline: boolean; status?: number; message: string };
export type ApiResult = ApiSuccess | ApiFailure;

export const OFFLINE_MESSAGE = "Sin conexión a internet.";

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export async function postJson(url: string, body: unknown): Promise<ApiResult> {
  if (isBrowserOffline()) {
    return { ok: false, offline: true, message: OFFLINE_MESSAGE };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // fetch solo lanza cuando la petición no llega al servidor (red caída, DNS, etc.).
    reportServerReachable(false);
    return { ok: false, offline: true, message: OFFLINE_MESSAGE };
  }
  reportServerReachable(true);

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    // Respuesta sin JSON: se decide solo por el código HTTP.
  }

  if (!response.ok || data.ok === false) {
    const message = typeof data.message === "string" ? data.message : `Error del servidor (${response.status}).`;
    return { ok: false, offline: false, status: response.status, message };
  }

  return { ok: true, data };
}
