import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import { connectionRegistry, pendingRequests } from "@/lib/ws-registry";
import { POST } from "../cancel/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/robot/cancel", {
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
            message: "Cancelado",
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

describe("POST /api/robot/cancel", () => {
  it("Property: requestId correlates correctly for cancel payload", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 30 }), async (robotId) => {
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
                message: "Cancelado",
              });
            }
          }),
          close: vi.fn(),
        };

        connectionRegistry.set(robotId, ws as never);

        const req = makeRequest({ robotId });
        const res = await POST(req);
        const body = (await res.json()) as { ok: boolean; message: string };

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(capturedRequestId).not.toBeNull();
        expect(ws.send).toHaveBeenCalledOnce();
      }),
      { numRuns: 50 }
    );
  });

  it("returns 404 when robotId is not registered", async () => {
    const req = makeRequest({ robotId: "unknown-robot" });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/robot/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);
  });

  it("returns 504 when timeout occurs before robot responds", async () => {
    vi.useFakeTimers();

    const ws = {
      send: vi.fn(),
      close: vi.fn(),
    };
    connectionRegistry.set("temi-timeout", ws as never);

    const req = makeRequest({ robotId: "temi-timeout" });
    const responsePromise = POST(req);

    await vi.advanceTimersByTimeAsync(301_000);

    const res = await responsePromise;
    expect(res.status).toBe(504);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);

    vi.useRealTimers();
  });
});
