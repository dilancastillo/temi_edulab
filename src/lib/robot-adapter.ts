export const FALLBACK_LOCATIONS = ["Sala Principal"];

export function getRobotId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("esbot.robotId.v1");
    if (stored && stored.length > 0) return stored;
  }
  return "temi-1";
}

export function setRobotId(id: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("esbot.robotId.v1", id);
  }
}

export async function fetchRobotLocations(): Promise<string[]> {
  try {
    const response = await fetch(`/api/robot/locations?robotId=${getRobotId()}`);
    const data = (await response.json()) as { locations?: string[] };
    const locations = data.locations;
    if (!Array.isArray(locations) || locations.length === 0) return FALLBACK_LOCATIONS;
    return locations;
  } catch {
    return FALLBACK_LOCATIONS;
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

export type ShowImageCommand = {
  type: "ShowImage";
  imageUrl: string;
};

export type ShowVideoCommand = {
  type: "ShowVideo";
  videoUrl: string;
};

// ─── Condition command types ──────────────────────────────────────────────────

export type ConditionAction =
  | { type: "Navigate"; location: string }
  | { type: "Say"; text: string }
  | { type: "ShowImage"; imageUrl: string };

export type ConditionOption = {
  keyword: string;
  action: ConditionAction;
};

export type AskConditionCommand = {
  type: "AskCondition";
  question: string;
  options: ConditionOption[];
};

export type RepeatCommand = {
  type: "Repeat";
  times: number;
  commands: RobotExecuteCommand[];
};

export type WhileCountCommand = {
  type: "WhileCount";
  limit: number;
  commands: RobotExecuteCommand[];
};

export type WhileTimerCommand = {
  type: "WhileTimer";
  seconds: number;
  commands: RobotExecuteCommand[];
};

export type WhileListenCommand = {
  type: "WhileListen";
  stopWord: string;
  maxIterations: number;
  commands: RobotExecuteCommand[];
};

export type RobotExecuteCommand = NavigateCommand | SayCommand | ShowImageCommand | ShowVideoCommand | AskConditionCommand | RepeatCommand | WhileCountCommand | WhileTimerCommand | WhileListenCommand;

export async function uploadVideo(file: File): Promise<{ ok: boolean; videoUrl?: string; message?: string }> {
  try {
    const formData = new FormData();
    formData.append("video", file);
    const res = await fetch("/api/video/upload", { method: "POST", body: formData });
    const data = (await res.json()) as { ok: boolean; id?: string; videoUrl?: string; message?: string };
    if (!data.ok || !data.videoUrl) return { ok: false, message: data.message ?? "Error subiendo video" };
    return { ok: true, videoUrl: data.videoUrl };
  } catch {
    return { ok: false, message: "Error subiendo video" };
  }
}

export async function uploadImage(file: File): Promise<{ ok: boolean; imageUrl?: string; message?: string }> {
  try {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/image/upload", { method: "POST", body: formData });
    const data = (await res.json()) as { ok: boolean; id?: string; imageUrl?: string; message?: string };
    if (!data.ok || !data.imageUrl) return { ok: false, message: data.message ?? "Error subiendo imagen" };
    return { ok: true, imageUrl: data.imageUrl };
  } catch {
    return { ok: false, message: "Error subiendo imagen" };
  }
}

// 1.2 Enviar comandos al robot vía POST /api/robot/execute
export async function executeRobotCommands(
  commands: RobotExecuteCommand[]
): Promise<RobotRunResult> {
  try {
    const response = await fetch(`/api/robot/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ robotId: getRobotId(), commands }),
    });
    const data = (await response.json()) as RobotRunResult;
    if (response.ok) {
      return { ok: true, message: data.message ?? "OK" };
    }
    return { ok: false, message: data.message ?? `Error ${response.status}` };
  } catch {
    return { ok: false, message: "Robot no disponible o tiempo de espera agotado" };
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

// ─── Condition helpers ────────────────────────────────────────────────────────

function buildConditionAction(type: ConditionAction["type"], value: string): ConditionAction | null {
  switch (type) {
    case "Navigate":  return { type: "Navigate", location: value };
    case "Say":       return { type: "Say", text: value };
    case "ShowImage": return { type: "ShowImage", imageUrl: value };
    default:          return null;
  }
}

// Extraer todos los comandos ejecutables del workspace en orden de secuencia
export function extractCommandsFromWorkspace(workspaceState: unknown): RobotExecuteCommand[] {
  try {
    if (!workspaceState || typeof workspaceState !== "object") return [];
    const ws = workspaceState as Record<string, unknown>;
    const topBlocks = (ws["blocks"] as Record<string, unknown>)?.["blocks"];
    if (!Array.isArray(topBlocks)) return [];

    function walk(block: unknown, acc: RobotExecuteCommand[]): void {
      if (!block || typeof block !== "object") return;
      const b = block as Record<string, unknown>;
      const fields = b["fields"] as Record<string, string> | undefined;

      if (b["type"] === "temi_move") {
        const location = fields?.["LOCATION"];
        if (location) acc.push({ type: "Navigate", location });
      } else if (b["type"] === "temi_say") {
        const text = fields?.["TEXT"];
        if (text) acc.push({ type: "Say", text });
      } else if (b["type"] === "temi_show_image") {
        const imageUrl = fields?.["IMAGE_URL"];
        if (imageUrl) acc.push({ type: "ShowImage", imageUrl });
      } else if (b["type"] === "temi_show_video") {
        const videoUrl = fields?.["VIDEO_URL"];
        if (videoUrl) acc.push({ type: "ShowVideo", videoUrl });
      } else if (b["type"] === "temi_condition") {
        const question = fields?.["QUESTION"];
        const optionCount = parseInt(fields?.["OPTION_COUNT"] ?? "2", 10);
        if (question && optionCount >= 2) {
          const options: ConditionOption[] = [];
          for (let i = 1; i <= optionCount; i++) {
            const keyword = fields?.[`KEYWORD_${i}`];
            const actionType = fields?.[`ACTION_TYPE_${i}`] as ConditionAction["type"] | undefined;
            let actionValue: string | undefined;
            if (actionType === "Navigate") {
              actionValue = fields?.[`ACTION_VALUE_NAVIGATE_${i}`];
            } else if (actionType === "Say") {
              actionValue = fields?.[`ACTION_VALUE_SAY_${i}`];
            } else if (actionType === "ShowImage") {
              actionValue = fields?.[`ACTION_VALUE_HIDDEN_${i}`];
            }
            if (keyword && actionType && actionValue) {
              const action = buildConditionAction(actionType, actionValue);
              if (action) options.push({ keyword, action });
            }
          }
          if (options.length >= 2) {
            acc.push({ type: "AskCondition", question, options });
          }
        }
      } else if (b["type"] === "temi_repeat") {
        const times = Math.max(1, Math.min(10, parseInt(fields?.["TIMES"] ?? "2", 10)));
        const doInput = (b["inputs"] as Record<string, unknown>)?.["DO"];
        const innerBlock = (doInput as Record<string, unknown>)?.["block"];
        const innerCommands: RobotExecuteCommand[] = [];
        walk(innerBlock, innerCommands);
        for (let i = 0; i < times; i++) {
          acc.push(...innerCommands);
        }
      } else if (b["type"] === "temi_while_count") {
        const limit = Math.max(1, Math.min(50, parseInt(fields?.["LIMIT"] ?? "5", 10)));
        const doInput = (b["inputs"] as Record<string, unknown>)?.["DO"];
        const innerBlock = (doInput as Record<string, unknown>)?.["block"];
        const innerCommands: RobotExecuteCommand[] = [];
        walk(innerBlock, innerCommands);
        for (let i = 0; i < limit; i++) acc.push(...innerCommands);
      } else if (b["type"] === "temi_while_timer") {
        const seconds = Math.max(1, Math.min(300, parseInt(fields?.["SECONDS"] ?? "30", 10)));
        const doInput = (b["inputs"] as Record<string, unknown>)?.["DO"];
        const innerBlock = (doInput as Record<string, unknown>)?.["block"];
        const innerCommands: RobotExecuteCommand[] = [];
        walk(innerBlock, innerCommands);
        acc.push({ type: "WhileTimer", seconds, commands: innerCommands });
      } else if (b["type"] === "temi_while_listen") {
        const rawWord = (fields?.["STOP_WORD"] ?? "").trim();
        const stopWord = rawWord.length > 0 ? rawWord : "listo";
        const doInput = (b["inputs"] as Record<string, unknown>)?.["DO"];
        const innerBlock = (doInput as Record<string, unknown>)?.["block"];
        const innerCommands: RobotExecuteCommand[] = [];
        walk(innerBlock, innerCommands);
        acc.push({ type: "WhileListen", stopWord, maxIterations: 5, commands: innerCommands });
      }

      const next = (b["next"] as Record<string, unknown>)?.["block"];
      if (next) walk(next, acc);
    }

    const commands: RobotExecuteCommand[] = [];
    for (const block of topBlocks) walk(block, commands);
    return commands;
  } catch {
    return [];
  }
}

// Extract all temi_show_image blocks with their IDs and current image URLs
export function extractShowImageBlocks(workspaceState: unknown): Array<{ id: string; imageUrl: string | null; index: number }> {
  try {
    if (!workspaceState || typeof workspaceState !== "object") return [];
    const ws = workspaceState as Record<string, unknown>;
    const topBlocks = (ws["blocks"] as Record<string, unknown>)?.["blocks"];
    if (!Array.isArray(topBlocks)) return [];

    const result: Array<{ id: string; imageUrl: string | null; index: number }> = [];
    let showImageIndex = 0;

    function walk(block: unknown): void {
      if (!block || typeof block !== "object") return;
      const b = block as Record<string, unknown>;
      if (b["type"] === "temi_show_image") {
        const id = b["id"] as string;
        const fields = b["fields"] as Record<string, string> | undefined;
        const imageUrl = fields?.["IMAGE_URL"] ?? null;
        result.push({ id, imageUrl: imageUrl && imageUrl.length > 0 ? imageUrl : null, index: showImageIndex++ });
      }
      const next = (b["next"] as Record<string, unknown>)?.["block"];
      if (next) walk(next);
    }

    for (const block of topBlocks) walk(block);
    return result;
  } catch {
    return [];
  }
}

export function extractVideoBlocks(workspaceState: unknown): Array<{ id: string; videoUrl: string | null; index: number }> {
  try {
    if (!workspaceState || typeof workspaceState !== "object") return [];
    const ws = workspaceState as Record<string, unknown>;
    const topBlocks = (ws["blocks"] as Record<string, unknown>)?.["blocks"];
    if (!Array.isArray(topBlocks)) return [];

    const result: Array<{ id: string; videoUrl: string | null; index: number }> = [];
    let index = 0;

    function walk(block: unknown): void {
      if (!block || typeof block !== "object") return;
      const b = block as Record<string, unknown>;
      if (b["type"] === "temi_show_video") {
        const id = b["id"] as string;
        const fields = b["fields"] as Record<string, string> | undefined;
        const videoUrl = fields?.["VIDEO_URL"] ?? null;
        result.push({ id, videoUrl: videoUrl && videoUrl.length > 0 ? videoUrl : null, index: index++ });
      }
      const next = (b["next"] as Record<string, unknown>)?.["block"];
      if (next) walk(next);
    }

    for (const block of topBlocks) walk(block);
    return result;
  } catch {
    return [];
  }
}

export function extractFieldFromBlock(workspaceState: unknown, blockType: string, fieldName: string): string | null {
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

