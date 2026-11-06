import { describe, expect, it } from "vitest";
import { baseOverrideId, mergeWithBaseMissions } from "./base-missions";
import { demoMissions } from "./demo-data";
import type { Mission } from "./types";

const base = demoMissions[0];

describe("mergeWithBaseMissions", () => {
  it("sin ediciones devuelve las misiones base y luego las propias", () => {
    const own: Mission = { ...base, id: "mission-propia", teacherId: "t1", title: "Mi misión" };
    const merged = mergeWithBaseMissions([own]);
    expect(merged.slice(0, demoMissions.length)).toEqual(demoMissions);
    expect(merged.at(-1)).toEqual(own);
  });

  it("la copia editada reemplaza a la base y conserva el id base", () => {
    const edited: Mission = { ...base, id: baseOverrideId(base.id, "t1"), teacherId: "t1", title: "Título del docente" };
    const merged = mergeWithBaseMissions([edited]);
    expect(merged).toHaveLength(demoMissions.length);
    const shown = merged.find((m) => m.id === base.id)!;
    expect(shown.title).toBe("Título del docente");
    expect(shown.storageId).toBe(edited.id);
    expect(shown.baseMissionId).toBe(base.id);
  });
});
