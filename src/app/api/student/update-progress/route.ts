import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      id: string;
      progress: string;
      currentMissionId?: string;
    };

    await pool.query(
      "UPDATE students SET progress = $1, current_mission_id = $2 WHERE id = $3",
      [body.progress, body.currentMissionId ?? null, body.id]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("update-progress error:", e);
    return NextResponse.json({ ok: false, message: "Error interno del servidor." }, { status: 500 });
  }
}
