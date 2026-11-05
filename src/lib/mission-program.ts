import { blockName, extractProgram } from "@/lib/mission-steps";
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
 * Cuántos pasos de la misión cumple el programa del estudiante, en orden.
 * Con workspaceState la comparación es estricta (tipo de bloque + bloque contenedor);
 * sin él, se compara solo la secuencia del nivel principal.
 */
export function evaluateOrderSteps(
  sequence: string[] | BlockWithFields[],
  program = orderStepsProgram,
  workspaceState?: unknown
): ProgramEvaluation {
  // Con el programa completo (workspace) la evaluación es estricta: el paso N se cumple
  // solo si el bloque N del programa del estudiante es del mismo tipo y está dentro del
  // mismo bloque que en la solución. Se cuentan los pasos seguidos desde el primero.
  if (workspaceState !== undefined) {
    const actual = extractProgram(workspaceState);
    let completedSteps = 0;
    for (const expectedStep of program) {
      const node = actual[completedSteps];
      if (!node || node.type !== expectedStep.type || node.parentType !== expectedStep.parentType) break;
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
          ? `Siguiente bloque: ${nextStep.label} (dentro de "${blockName(nextStep.parentType)}").`
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

