export type ProgramBlockType = "temi_start" | "temi_move" | "temi_say" | "temi_show" | "temi_audio" | "temi_show_image" | "temi_show_video";

export type ProgramStep = {
  type: ProgramBlockType;
  label: string;
  helper: string;
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

export function evaluateOrderSteps(
  sequence: string[] | BlockWithFields[],
  program = orderStepsProgram
): ProgramEvaluation {
  let completedSteps = 0;

  for (const expectedStep of program) {
    const item = sequence[completedSteps];
    const blockType = typeof item === "string" ? item : item?.type;
    if (blockType !== expectedStep.type) {
      break;
    }
    completedSteps += 1;
  }

  const nextStep = program[completedSteps];

  if (completedSteps === program.length) {
    return {
      completedSteps,
      totalSteps: program.length,
      isComplete: true,
      message: "Secuencia completa. Ya puedes enviar tu misión."
    };
  }

  return {
    completedSteps,
    totalSteps: program.length,
    isComplete: false,
    nextStep,
    message: nextStep ? `Siguiente bloque: ${nextStep.label}.` : "Revisa el orden de los bloques."
  };
}

