import { beforeEach, describe, expect, it } from "vitest";
import { clearDraftIfSaved, isDraftNewer, readDraft, writeDraft, type WorkDraft } from "../work-drafts";

const draft = (updatedAt: number): WorkDraft => ({
  workspaceState: { blocks: { blocks: [{ type: "temi_start" }] } },
  stepIndex: 1,
  missionId: "mission-1",
  updatedAt,
});

beforeEach(() => window.localStorage.clear());

describe("work-drafts", () => {
  it("guarda y recupera el borrador por estudiante y asignación", () => {
    writeDraft("s1", "a1", draft(1000));
    expect(readDraft("s1", "a1")).toEqual(draft(1000));
    expect(readDraft("s1", "otra")).toBeNull();
    expect(readDraft("otro", "a1")).toBeNull();
  });

  it("ignora un borrador corrupto en vez de romper la pantalla", () => {
    window.localStorage.setItem("esbot.workDraft.v1.s1.a1", "{no es json");
    expect(readDraft("s1", "a1")).toBeNull();
  });

  it("borra el borrador cuando el servidor confirmó el último cambio", () => {
    writeDraft("s1", "a1", draft(1000));
    clearDraftIfSaved("s1", "a1", 1000);
    expect(readDraft("s1", "a1")).toBeNull();
  });

  it("no borra cambios hechos mientras el guardado estaba en curso", () => {
    writeDraft("s1", "a1", draft(2000));
    clearDraftIfSaved("s1", "a1", 1000);
    expect(readDraft("s1", "a1")?.updatedAt).toBe(2000);
  });

  it("el borrador gana solo si es más nuevo que lo guardado en el servidor", () => {
    const server = new Date(5000).toISOString();
    expect(isDraftNewer(draft(6000), server)).toBe(true);
    expect(isDraftNewer(draft(4000), server)).toBe(false);
    expect(isDraftNewer(draft(4000), undefined)).toBe(true);
    expect(isDraftNewer(null, server)).toBe(false);
  });
});
