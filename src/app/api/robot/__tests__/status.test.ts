import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { connectionRegistry } from "@/lib/ws-registry";
import { GET } from "../status/route";
import { NextRequest } from "next/server";

function makeRequest(robotId?: string): NextRequest {
  const url = robotId
    ? `http://localhost/api/robot/status?robotId=${encodeURIComponent(robotId)}`
    : "http://localhost/api/robot/status";
  return new NextRequest(url);
}

function makeMockWs() {
  return { send: () => {}, close: () => {} };
}

beforeEach(() => {
  connectionRegistry.clear();
});

describe("GET /api/robot/status", () => {
  // Feature: robot-server-proxy, Property 8: Para cualquier robotId, el status refleja el estado del registry
  it("Property 8: status reflects registry state for any robotId", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.boolean(),
        async (robotId, isRegistered) => {
          connectionRegistry.clear();

          if (isRegistered) {
            connectionRegistry.set(robotId, makeMockWs() as never);
          }

          const req = makeRequest(robotId);
          const res = await GET(req);
          const body = (await res.json()) as { connected: boolean };

          expect(res.status).toBe(200);
          expect(body.connected).toBe(isRegistered);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("example: status without robotId returns 400", async () => {
    const req = makeRequest();
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("example: status for registered robot returns connected: true", async () => {
    connectionRegistry.set("temi-1", makeMockWs() as never);
    const req = makeRequest("temi-1");
    const res = await GET(req);
    const body = (await res.json()) as { connected: boolean };
    expect(body.connected).toBe(true);
  });

  it("example: status for unregistered robot returns connected: false", async () => {
    const req = makeRequest("temi-unknown");
    const res = await GET(req);
    const body = (await res.json()) as { connected: boolean };
    expect(body.connected).toBe(false);
  });
});
