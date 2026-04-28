import { NextRequest, NextResponse } from "next/server";
import { connectionRegistry, pendingRequests } from "@/lib/ws-registry";
import type { RobotExecuteCommand } from "@/lib/robot-adapter";

type CommandMessage = {
  type: "execute";
  requestId: string;
  commands: RobotExecuteCommand[];
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { robotId?: string; commands?: RobotExecuteCommand[] };
  try {
    body = (await req.json()) as { robotId?: string; commands?: RobotExecuteCommand[] };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Parámetros requeridos: robotId y commands" },
      { status: 400 }
    );
  }

  const { robotId, commands } = body;
  if (!robotId || !commands) {
    return NextResponse.json(
      { ok: false, message: "Parámetros requeridos: robotId y commands" },
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

  const commandMessage: CommandMessage = { type: "execute", requestId, commands };
  ws.send(JSON.stringify(commandMessage));

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
