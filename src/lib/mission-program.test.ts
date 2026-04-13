import { describe, expect, it, vi } from "vitest";
import * as fc from "fast-check";
import { evaluateOrderSteps, extractNavigateStep, orderStepsProgram } from "@/lib/mission-program";

describe("orderStepsProgram", () => {
  it("temi_move label is 'Ir a ubicación'", () => {
    const step = orderStepsProgram.find(s => s.type === "temi_move");
    expect(step?.label).toBe("Ir a ubicación");
  });
});

describe("evaluateOrderSteps", () => {
  it("marks a full sequence as complete", () => {
    const result = evaluateOrderSteps(["temi_start", "temi_move", "temi_say", "temi_show", "temi_audio"]);

    expect(result.isComplete).toBe(true);
    expect(result.completedSteps).toBe(5);
  });

  it("stops progress at the first missing block", () => {
    const result = evaluateOrderSteps(["temi_start", "temi_say", "temi_move"]);

    expect(result.isComplete).toBe(false);
    expect(result.completedSteps).toBe(1);
    expect(result.nextStep?.type).toBe("temi_move");
  });

  it("accepts BlockWithFields objects", () => {
    const result = evaluateOrderSteps([
      { type: "temi_start" },
      { type: "temi_move", fields: { LOCATION: "Biblioteca" } },
      { type: "temi_say" },
      { type: "temi_show" },
      { type: "temi_audio" },
    ]);

    expect(result.isComplete).toBe(true);
  });
});

describe("extractNavigateStep", () => {
  it("returns Navigate step with primaryValue equal to LOCATION", () => {
    const step = extractNavigateStep({ type: "temi_move", fields: { LOCATION: "Biblioteca" } });
    expect(step).toEqual({ type: "Navigate", primaryValue: "Biblioteca" });
  });

  it("returns null and calls console.warn when LOCATION is empty", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const step = extractNavigateStep({ type: "temi_move", fields: { LOCATION: "" } });
    expect(step).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns null and calls console.warn when LOCATION is absent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const step = extractNavigateStep({ type: "temi_move" });
    expect(step).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

/**
 * Property 6: Extracción del campo LOCATION genera Navigate con primaryValue correcto
 * Validates: Requirements 4.1, 4.2
 */
describe("P6: LOCATION → Navigate primaryValue", () => {
  it("for any non-empty location string, generates Navigate with correct primaryValue", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (location) => {
        const step = extractNavigateStep({ type: "temi_move", fields: { LOCATION: location } });
        return step !== null && step.type === "Navigate" && step.primaryValue === location;
      })
    );
  });
});
