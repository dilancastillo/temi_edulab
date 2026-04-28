import { NextRequest, NextResponse } from "next/server";
import { connectionRegistry, pendingRequests } from "@/lib/ws-registry";

const FALLBACK = { locations: ["Sala Principal"] };

type LocationsRequestMessage = {
  type: "locations";
  requestId: string;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const robotId = req.nextUrl.searchParams.get("robotId");
  if (!robotId) {
    return NextResponse.json(
      { ok: false, message: "Parámetro requerido: robotId" },
      { status: 400 }
    );
  }

  const ws = connectionRegistry.get(robotId);
  if (!ws) {
    return NextResponse.json(FALLBACK, { status: 200 });
  }

  const requestId = crypto.randomUUID();

  const responsePromise = new Promise<string[]>((resolve) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      resolve([]);
    }, 5_000);

    pendingRequests.set(requestId, {
      resolve: (msg) => {
        clearTimeout(timeout);
        if (msg.type === "locations_response") {
          resolve(msg.locations);
        } else {
          resolve([]);
        }
      },
      reject: () => {
        clearTimeout(timeout);
        resolve([]);
      },
    });
  });

  const locationsRequest: LocationsRequestMessage = { type: "locations", requestId };
  ws.send(JSON.stringify(locationsRequest));

  const locations = await responsePromise;
  if (!locations || locations.length === 0) {
    return NextResponse.json(FALLBACK, { status: 200 });
  }
  return NextResponse.json({ locations }, { status: 200 });
}
