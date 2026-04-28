import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import { connectionRegistry, pendingRequests } from "@/lib/ws-registry";
import { POST } from "../execute/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/robot/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeMockWs(autoRespond?: { requestId?: string }) {
  const ws = {
    send: vi.fn((data: string) => {
      if (autoRespond) {
        const msg = JSON.parse(data) as { requestId: string };
        const reqId = autoRespond.requestId ?? msg.requestId;
        const pending = pendingRequests.get(reqId);
        if (pending) {
          pending.resolve({
            type: "response",
            requestId: reqId,
            ok: true,
            message: "Ejecutado",
          });
        }
      }
    }),
    close: vi.fn(),
  };
  return ws;
}

beforeEach(() => {
  connectionRegistry.clear();
  pendingRequests.clear();
  vi.restoreAllMocks();
});

describe("POST /api/robot/execute", () => {
  // Feature: robot-server-proxy, Property 6: Para cualquier payload de comandos, el requestId correlaciona correctamente
  it("Property 6: requestId correlates correctly for any command payload", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.array(
          fc.record({ type: fc.constant("Say"), text: fc.string({ minLength: 1 }) }),
          { minLength: 1, maxLength: 5 }
        ),
        async (robotId, commands) => {
          connectionRegistry.clear();
          pendingRequests.clear();

          let capturedRequestId: string | null = null;

          const ws = {
            send: vi.fn((data: string) => {
              const msg = JSON.parse(data) as { requestId: string; type: string };
              capturedRequestId = msg.requestId;
              const pending = pendingRequests.get(msg.requestId);
              if (pending) {
                pending.resolve({
                  type: "response",
                  requestId: msg.requestId,
                  ok: true,
                  message: "OK",
                });
              }
            }),
            close: vi.fn(),
          };

          connectionRegistry.set(robotId, ws as never);

          const req = makeRequest({ robotId, commands });
          const res = await POST(req);
          const body = (await res.json()) as { ok: boolean; message: string };

          expect(res.status).toBe(200);
          expect(body.ok).toBe(true);
          expect(capturedRequestId).not.toBeNull();
          // The response corresponds to the message with the same requestId
          expect(ws.send).toHaveBeenCalledOnce();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("example: execute with unregistered robotId returns 404", async () => {
    const req = makeRequest({ robotId: "unknown-robot", commands: [{ type: "Say", text: "hi" }] });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);
  });

  it("example: execute without body returns 400", async () => {
    const req = new NextRequest("http://localhost/api/robot/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);
  });

  it("example: execute without robotId field returns 400", async () => {
    const req = makeRequest({ commands: [{ type: "Say", text: "hi" }] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);
  });

  it("example: timeout returns 504", async () => {
    vi.useFakeTimers();

    const ws = {
      send: vi.fn(),
      close: vi.fn(),
    };
    connectionRegistry.set("temi-timeout", ws as never);

    const req = makeRequest({ robotId: "temi-timeout", commands: [{ type: "Say", text: "hi" }] });
    const responsePromise = POST(req);

    // Advance timers past the 300s timeout
    await vi.advanceTimersByTimeAsync(301_000);

    const res = await responsePromise;
    expect(res.status).toBe(504);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);

    vi.useRealTimers();
  });
});
