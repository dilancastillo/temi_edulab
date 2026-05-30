export type ProgramBlockType = "temi_start" | "temi_move" | "temi_say" | "temi_show" | "temi_audio" | "temi_show_image" | "temi_show_video" | "temi_condition" | "temi_while_mqtt" | "temi_repeat" | "temi_while_count" | "temi_while_timer" | "temi_while_listen" | "temi_wait" | "temi_ask";

export type ProgramStep = {
  type: ProgramBlockType;
  label: string;
  helper: string;
  /** If set, this step must appear inside a block of this type (e.g. inside temi_repeat) */
  parentType?: ProgramBlockType;
};

export type BlockWithFields = {
  type: ProgramBlockType;
  fields?: Record<string, string>;
};

export type NavigateStep = {
  type: "Navigate";
  primaryValue: string;
};

export const orderStepsProgram: ProgramStep[] = [
  {
    type: "temi_start",
    label: "Cuando inicia",
    helper: "Todo programa necesita un bloque de inicio."
  },
  {
    type: "temi_move",
    label: "Ir a ubicación",
    helper: "Haz que Temi navegue a una ubicación del mapa."
  },
  {
    type: "temi_say",
    label: "Decir texto",
    helper: "Agrega un mensaje claro para la persona."
  },
  {
    type: "temi_show",
    label: "Mostrar señal",
    helper: "Muestra una señal visual en la pantalla."
  },
  {
    type: "temi_audio",
    label: "Reproducir audio",
    helper: "Termina con una confirmación sonora."
  }
];

export type ProgramEvaluation = {
  completedSteps: number;
  totalSteps: number;
  isComplete: boolean;
  nextStep?: ProgramStep;
  message: string;
};

export function extractNavigateStep(block: BlockWithFields): NavigateStep | null {
  const location = block.fields?.LOCATION ?? "";
  if (!location) {
    console.warn("temi_move: campo LOCATION vacío o ausente, se omite el paso.");
    return null;
  }
  return { type: "Navigate", primaryValue: location };
}

/**
 * Flattens a Blockly workspaceState into a list of { type, parentType } entries,
 * where parentType is the type of the containing block (if any).
 */
function flattenWorkspace(workspaceState: unknown): Array<{ type: string; parentType?: string }> {
  try {
    if (!workspaceState || typeof workspaceState !== "object") return [];
    const ws = workspaceState as Record<string, unknown>;
    const topBlocks = (ws["blocks"] as Record<string, unknown>)?.["blocks"];
    if (!Array.isArray(topBlocks)) return [];

    const result: Array<{ type: string; parentType?: string }> = [];

    function walk(block: unknown, parentType?: string): void {
      if (!block || typeof block !== "object") return;
      const b = block as Record<string, unknown>;
      const type = b["type"] as string;
      result.push({ type, parentType });
      // Recurse into child statement inputs (DO, ELSE, etc.)
      const inputs = b["inputs"] as Record<string, unknown> | undefined;
      if (inputs) {
        for (const inputKey of Object.keys(inputs)) {
          const inputBlock = (inputs[inputKey] as Record<string, unknown>)?.["block"];
          if (inputBlock) walk(inputBlock, type);
        }
      }
      // Continue to next sibling (same parent)
      const next = (b["next"] as Record<string, unknown>)?.["block"];
      if (next) walk(next, parentType);
    }

    for (const block of topBlocks) walk(block);
    return result;
  } catch { return []; }
}

export function evaluateOrderSteps(
  sequence: string[] | BlockWithFields[],
  program = orderStepsProgram,
  workspaceState?: unknown
): ProgramEvaluation {
  // If any step has a parentType, use workspace-based evaluation
  const hasNestedSteps = program.some((s) => s.parentType);

  if (hasNestedSteps && workspaceState !== undefined) {
    const flat = flattenWorkspace(workspaceState);
    let completedSteps = 0;

    for (const expectedStep of program) {
      // Find a matching block in the flat list that hasn't been consumed yet
      const matchIndex = flat.findIndex((entry, idx) => {
        if (idx < completedSteps) return false; // rough consumption tracking
        const typeMatch = entry.type === expectedStep.type;
        const parentMatch = expectedStep.parentType
          ? entry.parentType === expectedStep.parentType
          : entry.parentType === undefined || entry.parentType === null;
        return typeMatch && parentMatch;
      });

      if (matchIndex === -1) break;
      completedSteps += 1;
    }

    const nextStep = program[completedSteps];
    if (completedSteps === program.length) {
      return { completedSteps, totalSteps: program.length, isComplete: true, message: "Secuencia completa. Ya puedes enviar tu misión." };
    }
    return {
      completedSteps,
      totalSteps: program.length,
      isComplete: false,
      nextStep,
      message: nextStep
        ? nextStep.parentType
          ? `Siguiente bloque: ${nextStep.label} (dentro de un bloque ${nextStep.parentType}).`
          : `Siguiente bloque: ${nextStep.label}.`
        : "Revisa el orden de los bloques."
    };
  }

  // Fallback: flat sequence evaluation (original behavior)
  let completedSteps = 0;
  for (const expectedStep of program) {
    const item = sequence[completedSteps];
    const blockType = typeof item === "string" ? item : item?.type;
    if (blockType !== expectedStep.type) break;
    completedSteps += 1;
  }

  const nextStep = program[completedSteps];
  if (completedSteps === program.length) {
    return { completedSteps, totalSteps: program.length, isComplete: true, message: "Secuencia completa. Ya puedes enviar tu misión." };
  }
  return {
    completedSteps,
    totalSteps: program.length,
    isComplete: false,
    nextStep,
    message: nextStep ? `Siguiente bloque: ${nextStep.label}.` : "Revisa el orden de los bloques."
  };
}

