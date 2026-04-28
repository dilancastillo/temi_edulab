export class BackendError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BackendError";
    this.status = status;
  }
}

const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4000";

function buildBackendUnavailableMessage() {
  return `La API no responde en ${apiBaseUrl}. Verifica la base con npm.cmd run db:up y luego arranca la API con npm.cmd run dev:api.`;
}

export async function callBackend<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    token?: string | null;
  } = {}
) {
  const hasBody = options.body !== undefined;
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(hasBody ? { "content-type": "application/json" } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store"
    });
  } catch {
    throw new BackendError(503, buildBackendUnavailableMessage());
  }

  if (!response.ok) {
    let message = "No pudimos completar la solicitud.";

    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) {
        message = data.message;
      }
    } catch {
      // Ignore malformed backend responses and keep the generic message.
    }

    throw new BackendError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseType = response.headers.get("content-type") ?? "";
  if (!responseType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
