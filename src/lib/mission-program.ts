export type ProgramBlockType = "temi_start" | "temi_move" | "temi_say" | "temi_show" | "temi_audio";

export type ProgramStep = {
  type: ProgramBlockType;
  label: string;
  helper: string;
};

export const orderStepsProgram: ProgramStep[] = [
  {
    type: "temi_start",
    label: "Cuando inicia",
    helper: "Todo programa necesita un bloque de inicio."
  },
  {
    type: "temi_move",
    label: "Avanzar 2 pasos",
    helper: "Haz que Temi avance antes de hablar."
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

export function evaluateOrderSteps(sequence: string[]): ProgramEvaluation {
  let completedSteps = 0;

  for (const expectedStep of orderStepsProgram) {
    if (sequence[completedSteps] !== expectedStep.type) {
      break;
    }
    completedSteps += 1;
  }

  const nextStep = orderStepsProgram[completedSteps];

  if (completedSteps === orderStepsProgram.length) {
    return {
      completedSteps,
      totalSteps: orderStepsProgram.length,
      isComplete: true,
      message: "Secuencia completa. Ya puedes enviar tu misión."
    };
  }

  return {
    completedSteps,
    totalSteps: orderStepsProgram.length,
    isComplete: false,
    nextStep,
    message: nextStep ? `Siguiente bloque: ${nextStep.label}.` : "Revisa el orden de los bloques."
  };
}

