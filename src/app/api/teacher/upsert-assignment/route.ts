import { NextRequest, NextResponse } from "next/server";
import { upsertAssignment } from "@/lib/db-store";
import type { Assignment } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const assignment = await req.json() as Assignment;
    await upsertAssignment(assignment);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("upsert-assignment error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
