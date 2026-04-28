import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import { connectionRegistry, pendingRequests } from "@/lib/ws-registry";
import { GET } from "../locations/route";
import { NextRequest } from "next/server";

function makeRequest(robotId?: string): NextRequest {
  const url = robotId
    ? `http://localhost/api/robot/locations?robotId=${encodeURIComponent(robotId)}`
    : "http://localhost/api/robot/locations";
  return new NextRequest(url);
}

beforeEach(() => {
  connectionRegistry.clear();
  pendingRequests.clear();
  vi.restoreAllMocks();
});

describe("GET /api/robot/locations", () => {
  // Feature: robot-server-proxy, Property 7: Para cualquier petición de locations, el requestId correlaciona correctamente
  it("Property 7: requestId correlates correctly for any locations request", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        async (robotId, locations) => {
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
                  type: "locations_response",
                  requestId: msg.requestId,
                  locations,
                });
              }
            }),
            close: vi.fn(),
          };

          connectionRegistry.set(robotId, ws as never);

          const req = makeRequest(robotId);
          const res = await GET(req);
          const body = (await res.json()) as { locations: string[] };

          expect(res.status).toBe(200);
          expect(body.locations).toEqual(locations);
          expect(capturedRequestId).not.toBeNull();
          expect(ws.send).toHaveBeenCalledOnce();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("example: locations without robotId returns 400", async () => {
    const req = makeRequest();
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(false);
  });

  it("example: locations with unregistered robotId returns fallback", async () => {
    const req = makeRequest("not-registered");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { locations: string[] };
    expect(body.locations).toEqual(["Sala Principal"]);
  });
});
