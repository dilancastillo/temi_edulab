import { describe, expect, it } from "vitest";
import { evaluateOrderSteps } from "../mission-program";
import { buildMissionSteps, extractProgram, textsFromSteps, workspaceFromSteps } from "../mission-steps";
import type { MissionStep } from "../types";

type B = { id: string; type: string; next?: { block: B }; inputs?: Record<string, { block: B }> };
const chain = (...blocks: B[]): B => {
  for (let i = 0; i < blocks.length - 1; i++) blocks[i].next = { block: blocks[i + 1] };
  return blocks[0];
};
const ws = (...tops: B[]) => ({ blocks: { languageVersion: 0, blocks: tops } });

// La solución de la captura: inicia → repetir por tiempo → (repetir hasta sensor → (decir)) + ir a
const teacherSolution = () =>
  ws(
    chain(
      { id: "a", type: "temi_start" },
      {
        id: "b",
        type: "temi_while_timer",
        inputs: {
          DO: {
            block: chain(
              { id: "c", type: "temi_while_mqtt", inputs: { DO: { block: { id: "d", type: "temi_say" } } } },
              { id: "e", type: "temi_move" }
            ),
          },
        },
      }
    )
  );

describe("extractProgram", () => {
  it("recorre en orden de ejecución con el bloque contenedor de cada paso", () => {
    expect(extractProgram(teacherSolution())).toEqual([
      { blockId: "a", type: "temi_start", parentType: undefined, depth: 0 },
      { blockId: "b", type: "temi_while_timer", parentType: undefined, depth: 0 },
      { blockId: "c", type: "temi_while_mqtt", parentType: "temi_while_timer", depth: 1 },
      { blockId: "d", type: "temi_say", parentType: "temi_while_mqtt", depth: 2 },
      { blockId: "e", type: "temi_move", parentType: "temi_while_timer", depth: 1 },
    ]);
  });

  it("ignora bloques sueltos que no están conectados a 'cuando inicia'", () => {
    const state = ws({ id: "x", type: "temi_say" }, chain({ id: "a", type: "temi_start" }, { id: "b", type: "temi_move" }));
    expect(extractProgram(state).map((n) => n.blockId)).toEqual(["a", "b"]);
  });
});

describe("buildMissionSteps", () => {
  it("usa los textos del docente y, si faltan, textos amigables por defecto", () => {
    const nodes = extractProgram(teacherSolution());
    const steps = buildMissionSteps(nodes, { d: { label: "¡Saluda!", helper: "Temi saluda a la visita." } });
    expect(steps[0]).toEqual({ type: "temi_start", label: "Cuando inicia", helper: "Todo programa empieza con este bloque." });
    expect(steps[3]).toEqual({ type: "temi_say", label: "¡Saluda!", helper: "Temi saluda a la visita.", parentType: "temi_while_mqtt" });
    expect(steps.every((s) => !s.label.startsWith("temi_"))).toBe(true);
  });
});

describe("workspaceFromSteps (misiones creadas antes del editor de bloques)", () => {
  it("reconstruye orden y anidamiento, y conserva los textos", () => {
    const steps: MissionStep[] = [
      { type: "temi_start", label: "Inicio", helper: "h0" },
      { type: "temi_repeat", label: "Repite", helper: "h1" },
      { type: "temi_say", label: "Dice", helper: "h2", parentType: "temi_repeat" },
      { type: "temi_move", label: "Va", helper: "h3" },
    ];
    const state = workspaceFromSteps(steps);
    const nodes = extractProgram(state);
    expect(nodes.map((n) => [n.type, n.parentType])).toEqual([
      ["temi_start", undefined],
      ["temi_repeat", undefined],
      ["temi_say", "temi_repeat"],
      ["temi_move", undefined],
    ]);
    expect(buildMissionSteps(nodes, textsFromSteps(nodes, steps))).toEqual(steps);
  });
});

describe("evaluateOrderSteps con la solución en bloques", () => {
  const program = buildMissionSteps(extractProgram(teacherSolution()), {});

  it("completa todo cuando el estudiante arma lo mismo en el mismo orden y posición", () => {
    expect(evaluateOrderSteps([], program, teacherSolution()).isComplete).toBe(true);
  });

  it("no avanza si un bloque está en otra posición (fuera del bloque que lo contiene)", () => {
    // "decir" puesto después de "repetir hasta sensor" en vez de adentro
    const student = ws(
      chain(
        { id: "a", type: "temi_start" },
        {
          id: "b",
          type: "temi_while_timer",
          inputs: { DO: { block: chain({ id: "c", type: "temi_while_mqtt" }, { id: "d", type: "temi_say" }, { id: "e", type: "temi_move" }) } },
        }
      )
    );
    const result = evaluateOrderSteps([], program, student);
    expect(result.completedSteps).toBe(3);
    expect(result.isComplete).toBe(false);
    expect(result.message).toContain("Repetir hasta la señal del sensor");
  });

  it("no da por cumplidos pasos fuera de orden", () => {
    const student = ws(chain({ id: "a", type: "temi_start" }, { id: "e", type: "temi_move" }, { id: "b", type: "temi_while_timer" }));
    expect(evaluateOrderSteps([], program, student).completedSteps).toBe(1);
  });
});
