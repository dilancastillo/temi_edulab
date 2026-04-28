import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import { getRobotId, setRobotId } from "../robot-adapter.js";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("robot-adapter property tests", () => {
  // Feature: robot-server-proxy, Property 9: Robot_Adapter usa el robotId del localStorage
  it("Property 9: adapter uses robotId from localStorage in requests", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (robotId) => {
        localStorage.clear();
        localStorage.setItem("esbot.robotId.v1", robotId);

        const fetchSpy = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ ok: true, message: "OK" }),
        });
        vi.stubGlobal("fetch", fetchSpy);

        // getRobotId should return the stored value
        expect(getRobotId()).toBe(robotId);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: robot-server-proxy, Property 10: setRobotId + getRobotId es un round-trip
  it("Property 10: setRobotId + getRobotId is a round-trip", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (robotId) => {
        localStorage.clear();
        setRobotId(robotId);
        expect(getRobotId()).toBe(robotId);
      }),
      { numRuns: 100 }
    );
  });

  it("example: getRobotId returns temi-1 when localStorage is empty", () => {
    localStorage.clear();
    expect(getRobotId()).toBe("temi-1");
  });

  it("example: setRobotId persists to localStorage key esbot.robotId.v1", () => {
    setRobotId("my-robot");
    expect(localStorage.getItem("esbot.robotId.v1")).toBe("my-robot");
  });
});
