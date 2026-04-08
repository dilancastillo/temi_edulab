import { describe, expect, it } from "vitest";
import { evaluateOrderSteps } from "@/lib/mission-program";

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
});

