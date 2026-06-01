import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { Mission } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const mission = await req.json() as Mission;

    if (!mission.id || !mission.teacherId) {
      return NextResponse.json({ ok: false, message: "Faltan campos requeridos." }, { status: 400 });
    }

    await pool.query(
      `UPDATE missions SET
        title = $1,
        summary = $2,
        category = $3,
        age_band = $4,
        duration_minutes = $5,
        outcomes = $6,
        steps = $7,
        allowed_categories = $8,
        cover_tone = $9
       WHERE id = $10 AND teacher_id = $11`,
      [
        mission.title,
        mission.summary,
        mission.category,
        mission.ageBand,
        mission.durationMinutes,
        JSON.stringify(mission.outcomes),
        JSON.stringify(mission.steps ?? []),
        JSON.stringify(mission.allowedCategories ?? []),
        mission.coverTone,
        mission.id,
        mission.teacherId,
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("update-mission error:", e);
    return NextResponse.json({ ok: false, message: "Error al actualizar la misión." }, { status: 500 });
  }
}
