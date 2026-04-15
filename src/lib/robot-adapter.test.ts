import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractLocationFromWorkspace,
  executeRobotCommands,
  ROBOT_API_URL,
} from "./robot-adapter";

// ---------------------------------------------------------------------------
// Helpers para construir workspaceState de Blockly
// ---------------------------------------------------------------------------

function makeWorkspace(blocks: unknown[]) {
  return { blocks: { blocks } };
}

function makeTemiMoveBlock(location: string) {
  return { type: "temi_move", fields: { LOCATION: location } };
}

function makeStartWithNext(nextBlock: unknown) {
  return { type: "temi_start", next: { block: nextBlock } };
}

// ---------------------------------------------------------------------------
// 6.1 extractLocationFromWorkspace
// ---------------------------------------------------------------------------

describe("extractLocationFromWorkspace", () => {
  it("devuelve la ubicación cuando hay un bloque temi_move con LOCATION válido", () => {
    const ws = makeWorkspace([makeTemiMoveBlock("Sala Principal")]);
    expect(extractLocationFromWorkspace(ws)).toBe("Sala Principal");
  });

  it("devuelve la ubicación cuando temi_move está anidado en next", () => {
    const ws = makeWorkspace([makeStartWithNext(makeTemiMoveBlock("Biblioteca"))]);
    expect(extractLocationFromWorkspace(ws)).toBe("Biblioteca");
  });

  it("devuelve null cuando no hay ningún bloque temi_move", () => {
    const ws = makeWorkspace([{ type: "temi_start", fields: {} }]);
    expect(extractLocationFromWorkspace(ws)).toBeNull();
  });

  it("devuelve null cuando el workspace está vacío (sin bloques)", () => {
    const ws = makeWorkspace([]);
    expect(extractLocationFromWorkspace(ws)).toBeNull();
  });

  it("devuelve null cuando el bloque temi_move tiene LOCATION vacío", () => {
    const ws = makeWorkspace([makeTemiMoveBlock("")]);
    expect(extractLocationFromWorkspace(ws)).toBeNull();
  });

  it("devuelve null cuando workspaceState es null", () => {
    expect(extractLocationFromWorkspace(null)).toBeNull();
  });

  it("devuelve null cuando workspaceState es undefined", () => {
    expect(extractLocationFromWorkspace(undefined)).toBeNull();
  });

  it("devuelve null cuando workspaceState no tiene la estructura esperada", () => {
    expect(extractLocationFromWorkspace({ foo: "bar" })).toBeNull();
    expect(extractLocationFromWorkspace("string")).toBeNull();
    expect(extractLocationFromWorkspace(42)).toBeNull();
  });

  it("nunca lanza excepción con cualquier input", () => {
    const inputs = [null, undefined, {}, [], "bad", 0, { blocks: null }, { blocks: { blocks: null } }];
    for (const input of inputs) {
      expect(() => extractLocationFromWorkspace(input)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// 6.2 executeRobotCommands
// ---------------------------------------------------------------------------

describe("executeRobotCommands", () => {
  const commands = [{ type: "Navigate" as const, location: "Sala Principal" }];

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devuelve {ok:true, message} cuando fetch responde 200 con ok:true", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, message: "Navigate dispatched" }),
    } as Response);

    const result = await executeRobotCommands(commands);

    expect(result.ok).toBe(true);
    expect(result.message).toBe("Navigate dispatched");
  });

  it("envía POST a /execute con el body correcto", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, message: "OK" }),
    } as Response);

    await executeRobotCommands(commands);

    expect(fetch).toHaveBeenCalledWith(
      `${ROBOT_API_URL}/execute`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands }),
      })
    );
  });

  it("devuelve {ok:false, message:'Robot no disponible'} cuando fetch lanza AbortError (timeout 5s)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" })
    );

    const result = await executeRobotCommands(commands);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Robot no disponible");
  });

  it("devuelve {ok:false} cuando fetch lanza error de red genérico", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await executeRobotCommands(commands);

    expect(result.ok).toBe(false);
  });

  it("devuelve {ok:false} cuando el servidor responde HTTP 500", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, message: "Internal Server Error" }),
    } as Response);

    const result = await executeRobotCommands(commands);

    expect(result.ok).toBe(false);
  });

  it("devuelve {ok:false} cuando el servidor responde HTTP 400", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, message: "Bad request" }),
    } as Response);

    const result = await executeRobotCommands(commands);

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Bad request");
  });

  it("nunca lanza excepción en ninguna condición de red", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("cualquier error"));
    await expect(executeRobotCommands(commands)).resolves.toBeDefined();
  });
});
