import { NextRequest, NextResponse } from "next/server";
import { deleteStudentById } from "@/lib/db-store";
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
      "SELECT teacher_id FROM students WHERE id = $1",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, message: "Estudiante no encontrado." }, { status: 404 });
    }

    const student = rows[0] as { teacher_id: string };
    if (student.teacher_id !== session.teacherId) {
      return NextResponse.json(
        { ok: false, message: "No autorizado." },
        { status: 403 }
      );
    }

    await deleteStudentById(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete-student error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
