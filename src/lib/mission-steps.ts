import type { ProgramBlockType } from "@/lib/mission-program";
import type { MissionStep } from "@/lib/types";

/**
 * Pasos de una misión a partir de bloques.
 *
 * El docente arma la solución con bloques; cada bloque es un paso, en el orden en que
 * aparecen desde "cuando inicia" y con el bloque que lo contiene (por ejemplo, dentro de
 * "repetir"). El estudiante completa un paso solo si su bloque coincide en orden y posición.
 */

/** Nombre amigable y textos por defecto de cada bloque (nunca se muestra el nombre de código). */
export const BLOCK_DEFAULTS: Record<ProgramBlockType, { label: string; helper: string }> = {
  temi_start: { label: "Cuando inicia", helper: "Todo programa empieza con este bloque." },
  temi_move: { label: "Ir a una ubicación", helper: "Lleva a Temi a un lugar del mapa." },
  temi_say: { label: "Decir un texto", helper: "Haz que Temi diga algo." },
  temi_ask: { label: "Hacer una pregunta", helper: "Temi pregunta y escucha la respuesta." },
  temi_show: { label: "Mostrar una señal", helper: "Temi muestra una señal en su pantalla." },
  temi_show_image: { label: "Mostrar una imagen", helper: "Temi muestra una imagen en su pantalla." },
  temi_show_video: { label: "Reproducir un video", helper: "Temi reproduce un video en su pantalla." },
  temi_audio: { label: "Reproducir un sonido", helper: "Temi reproduce un sonido." },
  temi_condition: { label: "Preguntar y decidir", helper: "Temi pregunta y reacciona según la respuesta." },
  temi_repeat: { label: "Repetir varias veces", helper: "Repite los bloques que pongas adentro." },
  temi_while_count: { label: "Repetir con contador", helper: "Repite los bloques de adentro mientras el contador no llegue al límite." },
  temi_while_timer: { label: "Repetir por un tiempo", helper: "Repite los bloques de adentro durante unos minutos." },
  temi_wait: { label: "Esperar", helper: "Temi espera unos segundos antes de seguir." },
  temi_while_listen: { label: "Repetir hasta escuchar", helper: "Repite los bloques de adentro hasta escuchar una palabra." },
  temi_while_mqtt: { label: "Repetir hasta la señal del sensor", helper: "Repite los bloques de adentro hasta recibir la señal del sensor." },
};

export function isProgramBlockType(type: unknown): type is ProgramBlockType {
  return typeof type === "string" && type in BLOCK_DEFAULTS;
}

export function blockName(type: ProgramBlockType): string {
  return BLOCK_DEFAULTS[type].label;
}

/** Un bloque del programa, en el orden en que se ejecuta. */
export type ProgramNode = {
  blockId: string;
  type: ProgramBlockType;
  parentType?: ProgramBlockType;
  depth: number;
};

type RawBlock = {
  id?: string;
  type?: string;
  inputs?: Record<string, { block?: RawBlock } | undefined>;
  next?: { block?: RawBlock };
};

function topBlocks(workspaceState: unknown): RawBlock[] {
  if (!workspaceState || typeof workspaceState !== "object") return [];
  const blocks = (workspaceState as { blocks?: { blocks?: unknown } }).blocks?.blocks;
  return Array.isArray(blocks) ? (blocks as RawBlock[]) : [];
}

/**
 * Recorre el programa desde "cuando inicia" (o desde la primera pila si no lo hay):
 * cada bloque, luego lo que tiene adentro y luego el siguiente. Los bloques sueltos
 * que no están conectados al programa no cuentan.
 */
export function extractProgram(workspaceState: unknown): ProgramNode[] {
  const tops = topBlocks(workspaceState);
  const root = tops.find((b) => b.type === "temi_start") ?? tops[0];
  const nodes: ProgramNode[] = [];

  function walk(start: RawBlock | undefined, parentType: ProgramBlockType | undefined, depth: number) {
    let block = start;
    while (block) {
      const known = isProgramBlockType(block.type) ? block.type : undefined;
      if (known) nodes.push({ blockId: block.id ?? `${nodes.length}`, type: known, parentType, depth });
      for (const input of Object.values(block.inputs ?? {})) {
        if (input?.block) walk(input.block, known ?? parentType, depth + 1);
      }
      block = block.next?.block;
    }
  }

  walk(root, undefined, 0);
  return nodes;
}

export type StepTexts = Record<string, { label?: string; helper?: string }>;

/** Convierte la solución del docente en los pasos que ve el estudiante. */
export function buildMissionSteps(nodes: ProgramNode[], texts: StepTexts): MissionStep[] {
  return nodes.map((node) => {
    const custom = texts[node.blockId];
    const defaults = BLOCK_DEFAULTS[node.type];
    const step: MissionStep = {
      type: node.type,
      label: custom?.label?.trim() || defaults.label,
      helper: custom?.helper?.trim() || defaults.helper,
    };
    if (node.parentType) step.parentType = node.parentType;
    return step;
  });
}

/** Textos por bloque a partir de pasos guardados (mismo orden que la solución). */
export function textsFromSteps(nodes: ProgramNode[], steps: MissionStep[]): StepTexts {
  const texts: StepTexts = {};
  nodes.forEach((node, index) => {
    const step = steps[index];
    if (step && step.type === node.type) texts[node.blockId] = { label: step.label, helper: step.helper };
  });
  return texts;
}

/** Bloques con espacio para poner otros adentro (entrada "DO"). */
const CONTAINER_TYPES = new Set<ProgramBlockType>([
  "temi_repeat",
  "temi_while_count",
  "temi_while_timer",
  "temi_while_listen",
  "temi_while_mqtt",
]);

/**
 * Arma una solución en bloques a partir de pasos guardados, para misiones creadas
 * antes de existir el editor de bloques. Un paso con parentType se pone dentro del
 * último bloque contenedor de ese tipo; si no hay uno, va en el nivel principal.
 */
export function workspaceFromSteps(steps: MissionStep[]): unknown {
  type Built = { id: string; type: string; next?: { block: Built }; inputs?: { DO?: { block: Built } } };
  const created: Built[] = [];
  const lastInContainer = new Map<string, Built>();
  let topFirst: Built | undefined;
  let topLast: Built | undefined;

  steps.forEach((step, index) => {
    const block: Built = { id: `step-${index}`, type: step.type };
    const container = step.parentType && CONTAINER_TYPES.has(step.parentType)
      ? [...created].reverse().find((b) => b.type === step.parentType)
      : undefined;

    if (container) {
      const last = lastInContainer.get(container.id);
      if (last) last.next = { block };
      else container.inputs = { DO: { block } };
      lastInContainer.set(container.id, block);
    } else if (topLast) {
      topLast.next = { block };
      topLast = block;
    } else {
      topFirst = block;
      topLast = block;
    }
    created.push(block);
  });

  return { blocks: { languageVersion: 0, blocks: topFirst ? [{ ...topFirst, x: 40, y: 40 }] : [] } };
}
