import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import { connectionRegistry, pendingRequests } from "../ws-registry.js";
import { handleWsConnection } from "../ws-handler.js";

// Mock WebSocket factory
function makeMockWs() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const ws = {
    send: vi.fn(),
    close: vi.fn(),
    once: (event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    },
    on: (event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    },
    emit: (event: string, ...args: unknown[]) => {
      (listeners[event] ?? []).forEach((cb) => cb(...args));
    },
  };
  return ws;
}

type MockWs = ReturnType<typeof makeMockWs>;

function registerRobot(robotId: string, ws: MockWs) {
  handleWsConnection(ws as never, {} as never);
  ws.emit("message", Buffer.from(JSON.stringify({ type: "register", robotId })));
}

beforeEach(() => {
  connectionRegistry.clear();
  pendingRequests.clear();
});

describe("ws-registry property tests", () => {
  // Feature: robot-server-proxy, Property 2: El registro almacena correctamente el robotId
  it("Property 2: registry stores robotId after RegisterMessage", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (robotId) => {
        connectionRegistry.clear();
        const ws = makeMockWs();
        registerRobot(robotId, ws);
        expect(connectionRegistry.has(robotId)).toBe(true);
        expect(connectionRegistry.get(robotId)).toBe(ws);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: robot-server-proxy, Property 3: El reregistro reemplaza la conexión anterior
  it("Property 3: re-registration replaces previous connection", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (robotId) => {
        connectionRegistry.clear();
        const ws1 = makeMockWs();
        const ws2 = makeMockWs();

        registerRobot(robotId, ws1);
        expect(connectionRegistry.get(robotId)).toBe(ws1);

        registerRobot(robotId, ws2);
        expect(connectionRegistry.get(robotId)).toBe(ws2);
        expect(ws1.close).toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  // Feature: robot-server-proxy, Property 4: El cierre de conexión limpia el registry
  it("Property 4: closing connection removes robotId from registry", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (robotId) => {
        connectionRegistry.clear();
        const ws = makeMockWs();
        registerRobot(robotId, ws);
        expect(connectionRegistry.has(robotId)).toBe(true);

        // Trigger close event
        ws.emit("close");
        expect(connectionRegistry.has(robotId)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: robot-server-proxy, Property 5: El registro soporta múltiples robots simultáneos
  it("Property 5: multiple distinct robotIds coexist in registry", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 30 }), {
          minLength: 2,
          maxLength: 10,
        }),
        (robotIds) => {
          connectionRegistry.clear();
          const wsMap = new Map<string, MockWs>();

          for (const robotId of robotIds) {
            const ws = makeMockWs();
            wsMap.set(robotId, ws);
            registerRobot(robotId, ws);
          }

          for (const robotId of robotIds) {
            expect(connectionRegistry.has(robotId)).toBe(true);
            expect(connectionRegistry.get(robotId)).toBe(wsMap.get(robotId));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("example: empty robotId closes connection with code 4001", () => {
    const ws = makeMockWs();
    handleWsConnection(ws as never, {} as never);
    ws.emit("message", Buffer.from(JSON.stringify({ type: "register", robotId: "" })));
    expect(ws.close).toHaveBeenCalledWith(4001, expect.any(String));
    expect(connectionRegistry.size).toBe(0);
  });

  it("example: invalid JSON closes connection with code 4001", () => {
    const ws = makeMockWs();
    handleWsConnection(ws as never, {} as never);
    ws.emit("message", Buffer.from("not-json"));
    expect(ws.close).toHaveBeenCalledWith(4001, expect.any(String));
  });
});
