import { NextResponse } from "next/server";

// Respuesta mínima para que el navegador compruebe que el servidor responde (ver connection-status.ts).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
