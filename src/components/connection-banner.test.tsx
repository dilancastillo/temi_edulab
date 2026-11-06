import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionBanner } from "./connection-banner";
import { reportServerReachable } from "@/lib/connection-status";

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => value });
}

beforeEach(() => {
  vi.useFakeTimers();
  setNavigatorOnline(true);
  reportServerReachable(true);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ConnectionBanner", () => {
  it("no muestra nada mientras hay conexión", () => {
    render(<ConnectionBanner offlineDetail="Detalle" />);
    expect(screen.queryByText("Sin conexión con el servidor")).toBeNull();
    expect(screen.queryByText("Conexión restablecida")).toBeNull();
  });

  it("avisa cuando el equipo pierde la red y avisa de nuevo cuando vuelve", async () => {
    render(<ConnectionBanner offlineDetail="Los cambios no se guardarán." />);

    act(() => {
      setNavigatorOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText("Sin conexión con el servidor")).toBeTruthy();
    expect(screen.getByText("Los cambios no se guardarán.")).toBeTruthy();

    await act(async () => {
      setNavigatorOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByText("Sin conexión con el servidor")).toBeNull();
    expect(screen.getByText("Conexión restablecida")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Conexión restablecida")).toBeNull();
  });

  it("avisa cuando hay red pero el servidor no responde", () => {
    render(<ConnectionBanner offlineDetail="Detalle" />);

    act(() => reportServerReachable(false));
    expect(screen.getByText("Sin conexión con el servidor")).toBeTruthy();

    act(() => reportServerReachable(true));
    expect(screen.getByText("Conexión restablecida")).toBeTruthy();
  });
});
