import { describe, expect, it } from "vitest";
import { demoMissions } from "./demo-data";
import { evaluateOrderSteps } from "./mission-program";
import { extractProgram } from "./mission-steps";

describe("misiones base", () => {
  it.each(demoMissions.map((m) => [m.title, m] as const))("«%s» tiene solución en bloques que coincide con sus pasos", (_title, mission) => {
    expect(mission.steps?.length).toBeGreaterThanOrEqual(5);
    const program = extractProgram(mission.solutionWorkspace);
    expect(program.map((n) => [n.type, n.parentType])).toEqual(mission.steps!.map((s) => [s.type, s.parentType]));

    const result = evaluateOrderSteps([], mission.steps!, mission.solutionWorkspace);
    expect(result.isComplete).toBe(true);
    expect(result.completedSteps).toBe(mission.steps!.length);
  });

  it("cada paso tiene título e instrucción para el estudiante", () => {
    for (const mission of demoMissions) {
      for (const step of mission.steps ?? []) {
        expect(step.label.trim()).not.toBe("");
        expect(step.helper.trim()).not.toBe("");
      }
    }
  });

  it("los bloques de cada solución están permitidos en la misión", () => {
    const categoryOf: Record<string, string> = {
      temi_start: "Movimiento", temi_move: "Movimiento", temi_say: "Hablar", temi_show_image: "Mostrar", temi_show_video: "Mostrar",
      temi_audio: "Audio", temi_condition: "Condición", temi_ask: "Condición", temi_repeat: "Control", temi_while_count: "Control",
      temi_while_timer: "Control", temi_wait: "Control", temi_while_listen: "Control", temi_while_mqtt: "Control",
    };
    for (const mission of demoMissions) {
      for (const step of mission.steps ?? []) {
        if (step.type === "temi_start") continue;
        expect(mission.allowedCategories, `${mission.title}: ${step.type}`).toContain(categoryOf[step.type]);
      }
    }
  });
});
