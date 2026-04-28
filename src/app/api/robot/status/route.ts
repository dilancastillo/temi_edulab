import { NextRequest, NextResponse } from "next/server";
import { connectionRegistry } from "@/lib/ws-registry";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const robotId = req.nextUrl.searchParams.get("robotId");
  if (!robotId) {
    return NextResponse.json(
      { ok: false, message: "Parámetro requerido: robotId" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { connected: connectionRegistry.has(robotId) },
    { status: 200 }
  );
}
