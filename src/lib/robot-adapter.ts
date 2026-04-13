export const ROBOT_API_URL = process.env.NEXT_PUBLIC_ROBOT_API_URL ?? "http://localhost:8765";
export const FALLBACK_LOCATIONS = ["Sala Principal"];

export async function fetchRobotLocations(): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${ROBOT_API_URL}/locations`, { signal: controller.signal });
    const data = (await response.json()) as { locations?: string[] };
    const locations = data.locations;
    if (!Array.isArray(locations) || locations.length === 0) return FALLBACK_LOCATIONS;
    return locations;
  } catch {
    return FALLBACK_LOCATIONS;
  } finally {
    clearTimeout(timeoutId);
  }
}

export type RobotCommand =
  | { type: "move"; steps: number }
  | { type: "say"; text: string }
  | { type: "show"; signal: "goal" | "alert" | "ready" }
  | { type: "audio"; clip: "confirm" | "bell" | "clap" };

export type RobotRunResult = {
  ok: boolean;
  message: string;
};

export interface RobotAdapter {
  name: string;
  run(commands: RobotCommand[]): Promise<RobotRunResult>;
}

export const temiV3DemoAdapter: RobotAdapter = {
  name: "Temi V3 demo adapter",
  async run(commands) {
    return {
      ok: true,
      message: `${commands.length} comandos validados en modo demo. El SDK de Temi V3 se conectará en la capa robot.`
    };
  }
};

// --- temi-execute-navigate ---

// 1.1 Tipos para el endpoint /execute
export type NavigateCommand = {
  type: "Navigate";
  location: string;
};

export type SayCommand = {
  type: "Say";
  text: string;
};

export type RobotExecuteCommand = NavigateCommand | SayCommand;

// 1.2 Enviar comandos al robot vía POST /execute con timeout de 5s
export async function executeRobotCommands(
  commands: RobotExecuteCommand[]
): Promise<RobotRunResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 min para secuencias largas
  try {
    const response = await fetch(`${ROBOT_API_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
      signal: controller.signal,
    });
    const data = (await response.json()) as RobotRunResult;
    if (response.ok) {
      return { ok: true, message: data.message ?? "OK" };
    }
    return { ok: false, message: data.message ?? `Error ${response.status}` };
  } catch {
    return { ok: false, message: "Robot no disponible o tiempo de espera agotado" };
  } finally {
    clearTimeout(timeoutId);
  }
}

// 1.3 Extraer el campo LOCATION del bloque temi_move del workspace serializado de Blockly
export function extractLocationFromWorkspace(workspaceState: unknown): string | null {
  return extractFieldFromBlock(workspaceState, "temi_move", "LOCATION");
}

// Extraer el campo TEXT del bloque temi_say del workspace serializado de Blockly
export function extractTextFromWorkspace(workspaceState: unknown): string | null {
  return extractFieldFromBlock(workspaceState, "temi_say", "TEXT");
}

// Extraer todos los comandos ejecutables del workspace en orden de secuencia
export function extractCommandsFromWorkspace(workspaceState: unknown): RobotExecuteCommand[] {
  try {
    if (!workspaceState || typeof workspaceState !== "object") return [];
    const ws = workspaceState as Record<string, unknown>;
    const topBlocks = (ws["blocks"] as Record<string, unknown>)?.["blocks"];
    if (!Array.isArray(topBlocks)) return [];

    const commands: RobotExecuteCommand[] = [];

    function walk(block: unknown): void {
      if (!block || typeof block !== "object") return;
      const b = block as Record<string, unknown>;
      const fields = b["fields"] as Record<string, string> | undefined;

      if (b["type"] === "temi_move") {
        const location = fields?.["LOCATION"];
        if (location) commands.push({ type: "Navigate", location });
      } else if (b["type"] === "temi_say") {
        const text = fields?.["TEXT"];
        if (text) commands.push({ type: "Say", text });
      }

      const next = (b["next"] as Record<string, unknown>)?.["block"];
      if (next) walk(next);
    }

    for (const block of topBlocks) walk(block);
    return commands;
  } catch {
    return [];
  }
}

function extractFieldFromBlock(workspaceState: unknown, blockType: string, fieldName: string): string | null {
  try {
    if (!workspaceState || typeof workspaceState !== "object") return null;
    const ws = workspaceState as Record<string, unknown>;
    const topBlocks = (ws["blocks"] as Record<string, unknown>)?.["blocks"];
    if (!Array.isArray(topBlocks)) return null;

    function find(block: unknown): string | null {
      if (!block || typeof block !== "object") return null;
      const b = block as Record<string, unknown>;
      if (b["type"] === blockType) {
        const val = (b["fields"] as Record<string, string> | undefined)?.[fieldName];
        return val && val.length > 0 ? val : null;
      }
      const next = (b["next"] as Record<string, unknown>)?.["block"];
      if (next) { const r = find(next); if (r) return r; }
      const inputs = b["inputs"] as Record<string, unknown> | undefined;
      if (inputs) {
        for (const key of Object.keys(inputs)) {
          const r = find((inputs[key] as Record<string, unknown>)?.["block"]);
          if (r) return r;
        }
      }
      return null;
    }

    for (const block of topBlocks) {
      const result = find(block);
      if (result !== null) return result;
    }
    return null;
  } catch {
    return null;
  }
}

