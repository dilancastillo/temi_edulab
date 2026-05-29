import { NextRequest, NextResponse } from "next/server";
import { connectionRegistry, pendingRequests } from "@/lib/ws-registry";

type CancelMessage = {
  type: "cancel";
  requestId: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { robotId?: string };
  try {
    body = (await req.json()) as { robotId?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Parámetro requerido: robotId" },
      { status: 400 }
    );
  }

  const { robotId } = body;
  if (!robotId) {
    return NextResponse.json(
      { ok: false, message: "Parámetro requerido: robotId" },
      { status: 400 }
    );
  }

  const ws = connectionRegistry.get(robotId);
  if (!ws) {
    return NextResponse.json(
      { ok: false, message: "Robot no conectado" },
      { status: 404 }
    );
  }

  const requestId = crypto.randomUUID();

  const responsePromise = new Promise<{ ok: boolean; message: string }>(
    (resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error("timeout"));
      }, 300_000);

      pendingRequests.set(requestId, {
        resolve: (msg) => {
          clearTimeout(timeout);
          if (msg.type === "response") {
            resolve({ ok: msg.ok, message: msg.message });
          }
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    }
  );

  const cancelMessage: CancelMessage = { type: "cancel", requestId };
  ws.send(JSON.stringify(cancelMessage));

  try {
    const result = await responsePromise;
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Robot no disponible o tiempo de espera agotado" },
      { status: 504 }
    );
  }
}
