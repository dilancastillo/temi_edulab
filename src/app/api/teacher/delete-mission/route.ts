import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const { id } = await req.json() as { id: string };

    // Verify ownership before deleting
    const { rows } = await pool.query(
      "SELECT teacher_id FROM missions WHERE id = $1",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, message: "Misión no encontrada." }, { status: 404 });
    }

    const mission = rows[0] as { teacher_id: string };
    if (mission.teacher_id !== session.teacherId) {
      return NextResponse.json(
        { ok: false, message: "No autorizado." },
        { status: 403 }
      );
    }

    await pool.query("DELETE FROM missions WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete-mission error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
