import { NextRequest, NextResponse } from "next/server";
import { insertMission } from "@/lib/db-store";
import type { Mission } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const mission = await req.json() as Mission;

    // Validación de servidor
    if (!mission.teacherId || mission.teacherId.trim() === "") {
      return NextResponse.json(
        { ok: false, message: "El teacherId es requerido." },
        { status: 400 }
      );
    }

    if (!mission.title || mission.title.trim() === "") {
      return NextResponse.json(
        { ok: false, message: "El título es requerido." },
        { status: 400 }
      );
    }

    if (!mission.durationMinutes || mission.durationMinutes <= 0) {
      return NextResponse.json(
        { ok: false, message: "La duración debe ser mayor a 0." },
        { status: 400 }
      );
    }

    await insertMission(mission);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("create-mission error:", e);
    return NextResponse.json(
      { ok: false, message: "Error al guardar la misión." },
      { status: 500 }
    );
  }
}
