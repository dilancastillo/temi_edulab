import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postJson } from "../api-client";

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => value });
}

beforeEach(() => {
  setOnline(true);
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  setOnline(true);
});

describe("postJson", () => {
  it("devuelve ok con los datos cuando el servidor confirma", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, id: "x" }), { status: 200 }));
    const result = await postJson("/api/x", { a: 1 });
    expect(result).toEqual({ ok: true, data: { ok: true, id: "x" } });
  });

  it("marca offline cuando la petición no llega al servidor", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const result = await postJson("/api/x", {});
    expect(result).toMatchObject({ ok: false, offline: true });
  });

  it("no intenta la petición si el navegador ya sabe que no hay conexión", async () => {
    setOnline(false);
    const result = await postJson("/api/x", {});
    expect(result).toMatchObject({ ok: false, offline: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("distingue un error del servidor de la falta de conexión", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, message: "Error interno." }), { status: 500 })
    );
    const result = await postJson("/api/x", {});
    expect(result).toEqual({ ok: false, offline: false, status: 500, message: "Error interno." });
  });

  it("trata un 500 sin cuerpo JSON como error del servidor", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 500 }));
    const result = await postJson("/api/x", {});
    expect(result).toMatchObject({ ok: false, offline: false, status: 500 });
  });
});
