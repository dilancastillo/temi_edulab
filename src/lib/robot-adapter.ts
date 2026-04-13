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

// Por ahora solo Navigate; se extenderá con Say, Show, Audio
export type RobotExecuteCommand = NavigateCommand;

// 1.2 Enviar comandos al robot vía POST /execute con timeout de 5s
export async function executeRobotCommands(
  commands: RobotExecuteCommand[]
): Promise<RobotRunResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
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
    return { ok: false, message: "Robot no disponible" };
  } finally {
    clearTimeout(timeoutId);
  }
}

// 1.3 Extraer el campo LOCATION del bloque temi_move del workspace serializado de Blockly
export function extractLocationFromWorkspace(workspaceState: unknown): string | null {
  try {
    if (!workspaceState || typeof workspaceState !== "object") return null;
    const ws = workspaceState as Record<string, unknown>;
    const blocksRoot = ws["blocks"];
    if (!blocksRoot || typeof blocksRoot !== "object") return null;
    const blocksObj = blocksRoot as Record<string, unknown>;
    const topBlocks = blocksObj["blocks"];
    if (!Array.isArray(topBlocks)) return null;

    // Búsqueda recursiva del primer bloque temi_move
    function findTemiMove(block: unknown): string | null {
      if (!block || typeof block !== "object") return null;
      const b = block as Record<string, unknown>;
      if (b["type"] === "temi_move") {
        const fields = b["fields"];
        if (fields && typeof fields === "object") {
          const location = (fields as Record<string, unknown>)["LOCATION"];
          if (typeof location === "string" && location.length > 0) return location;
        }
        return null;
      }
      // Buscar en next.block
      const next = b["next"];
      if (next && typeof next === "object") {
        const nextBlock = (next as Record<string, unknown>)["block"];
        const found = findTemiMove(nextBlock);
        if (found !== null) return found;
      }
      // Buscar en inputs (bloques anidados)
      const inputs = b["inputs"];
      if (inputs && typeof inputs === "object") {
        for (const key of Object.keys(inputs as object)) {
          const inputBlock = ((inputs as Record<string, unknown>)[key] as Record<string, unknown>)?.["block"];
          const found = findTemiMove(inputBlock);
          if (found !== null) return found;
        }
      }
      return null;
    }

    for (const block of topBlocks) {
      const location = findTemiMove(block);
      if (location !== null) return location;
    }
    return null;
  } catch {
    return null;
  }
}

