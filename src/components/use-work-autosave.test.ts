import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkAutosave, type SaveResult, type WorkPayload } from "./use-work-autosave";
import { readDraft, writeDraft } from "@/lib/work-drafts";

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => value });
}

const payload = (n: number): WorkPayload => ({ workspaceState: { version: n }, stepIndex: n });

function setup(save: (p: WorkPayload) => Promise<SaveResult>, options: { restored?: boolean } = {}) {
  if (options.restored) {
    writeDraft("s1", "a1", { ...payload(9), missionId: "m1", updatedAt: Date.now() });
  }
  return renderHook(() =>
    useWorkAutosave({
      studentId: "s1",
      assignmentId: "a1",
      missionId: "m1",
      save,
      restoredDraft: options.restored ? readDraft("s1", "a1") : null,
      autosaveDelayMs: 1000,
      retryDelayMs: 5000,
    })
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  setOnline(true);
});

afterEach(() => {
  vi.useRealTimers();
  setOnline(true);
});

describe("useWorkAutosave", () => {
  it("copia cada cambio al dispositivo al instante y lo envía tras unos segundos", async () => {
    const save = vi.fn(async () => ({ ok: true }));
    const { result } = setup(save);

    act(() => result.current.markChanged(payload(1)));
    expect(readDraft("s1", "a1")?.workspaceState).toEqual({ version: 1 });
    expect(result.current.status).toBe("dirty");
    expect(save).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(save).toHaveBeenCalledWith(payload(1));
    expect(result.current.status).toBe("saved");
    expect(readDraft("s1", "a1")).toBeNull();
  });

  it("sin conexión conserva el borrador y lo envía solo al reconectar", async () => {
    const save = vi.fn(async () => ({ ok: true }));
    const { result } = setup(save);
    setOnline(false);

    act(() => result.current.markChanged(payload(2)));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe("offline");
    expect(readDraft("s1", "a1")?.workspaceState).toEqual({ version: 2 });

    setOnline(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(save).toHaveBeenCalledWith(payload(2));
    expect(result.current.status).toBe("saved");
    expect(readDraft("s1", "a1")).toBeNull();
  });

  it("si el servidor falla, no borra el borrador y reintenta", async () => {
    const save = vi
      .fn<(p: WorkPayload) => Promise<SaveResult>>()
      .mockResolvedValueOnce({ ok: false, message: "Error interno." })
      .mockResolvedValueOnce({ ok: true });
    const { result } = setup(save);

    act(() => result.current.markChanged(payload(3)));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(result.current.status).toBe("error");
    expect(readDraft("s1", "a1")).not.toBeNull();

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("saved");
    expect(readDraft("s1", "a1")).toBeNull();
  });

  it("al abrir con un borrador recuperado lo envía de inmediato", async () => {
    const save = vi.fn(async () => ({ ok: true }));
    const { result } = setup(save, { restored: true });
    expect(result.current.status).toBe("dirty");

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(save).toHaveBeenCalledWith(payload(9));
    expect(result.current.status).toBe("saved");
  });

  it("abrir la misión sin editar no marca cambios (eventos de carga de Blockly)", async () => {
    const save = vi.fn(async () => ({ ok: true }));
    const { result } = setup(save);

    act(() => result.current.setBaseline(payload(5).workspaceState));
    let changed = true;
    act(() => { changed = result.current.markChanged(payload(5)); });

    expect(changed).toBe(false);
    expect(result.current.status).toBe("saved");
    expect(readDraft("s1", "a1")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(save).not.toHaveBeenCalled();
  });

  it("mover un bloque sí cuenta como cambio", () => {
    const save = vi.fn(async () => ({ ok: true }));
    const { result } = setup(save);

    act(() => result.current.setBaseline({ x: 10 }));
    let changed = false;
    act(() => { changed = result.current.markChanged({ workspaceState: { x: 50 }, stepIndex: 0 }); });

    expect(changed).toBe(true);
    expect(result.current.status).toBe("dirty");
  });

  it("avisa al cerrar la pestaña si hay cambios sin enviar", () => {
    const save = vi.fn(async () => ({ ok: true }));
    const { result } = setup(save);
    act(() => result.current.markChanged(payload(4)));

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
