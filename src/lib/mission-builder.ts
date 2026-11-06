import type { ProgramBlockType } from "@/lib/mission-program";
import type { MissionStep } from "@/lib/types";

/**
 * Arma una misión a partir de su programa en bloques: de una sola descripción salen
 * la solución (estado de Blockly) y los pasos con su texto para el estudiante.
 * Se usa para las misiones base, que viven en el código.
 */

export type BlockSpec = {
  type: ProgramBlockType;
  /** Título corto del paso que ve el estudiante. */
  label: string;
  /** Instrucción del paso, en lenguaje sencillo. */
  helper: string;
  fields?: Record<string, string | number>;
  /** Bloques que van dentro (solo para bloques de repetir). */
  children?: BlockSpec[];
};

type BuiltBlock = {
  type: string;
  id: string;
  fields?: Record<string, string | number>;
  inputs?: { DO: { block: BuiltBlock } };
  next?: { block: BuiltBlock };
};

export function buildMission(missionKey: string, program: BlockSpec[]): { steps: MissionStep[]; solutionWorkspace: unknown } {
  let counter = 0;
  const steps: MissionStep[] = [];

  function chain(specs: BlockSpec[], parentType?: ProgramBlockType): BuiltBlock | undefined {
    let first: BuiltBlock | undefined;
    let last: BuiltBlock | undefined;
    for (const spec of specs) {
      counter += 1;
      // Mismo orden que extractProgram: el bloque, luego lo de adentro, luego el siguiente.
      steps.push({ type: spec.type, label: spec.label, helper: spec.helper, ...(parentType ? { parentType } : {}) });
      const block: BuiltBlock = { type: spec.type, id: `${missionKey}-${counter}` };
      if (spec.fields) block.fields = spec.fields;
      if (spec.children?.length) {
        const inner = chain(spec.children, spec.type);
        if (inner) block.inputs = { DO: { block: inner } };
      }
      if (last) last.next = { block };
      else first = block;
      last = block;
    }
    return first;
  }

  const root = chain(program);
  return {
    steps,
    solutionWorkspace: { blocks: { languageVersion: 0, blocks: root ? [{ ...root, x: 40, y: 40 }] : [] } },
  };
}

// ── Atajos para escribir los programas de forma legible ─────────────────────────

export function say(text: string, label: string, helper: string): BlockSpec {
  return {
    type: "temi_say",
    label,
    helper,
    fields: { TEXT: text, GENDER: "FEMALE", SPEED: 1, PITCH: 0, LANGUAGE: "ES_ES", SHOW_ANIMATION: "true" },
  };
}

/** Pregunta con opciones; cada opción responde con un texto. */
export function askAndDecide(question: string, options: [keyword: string, answer: string][], label: string, helper: string): BlockSpec {
  const fields: Record<string, string | number> = { QUESTION: question, OPTION_COUNT: options.length };
  options.forEach(([keyword, answer], index) => {
    const n = index + 1;
    fields[`KEYWORD_${n}`] = keyword;
    fields[`ACTION_TYPE_${n}`] = "Say";
    fields[`ACTION_VALUE_SAY_${n}`] = answer;
  });
  return { type: "temi_condition", label, helper, fields };
}
