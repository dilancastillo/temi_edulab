import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { FEEDBACK_MAX_LENGTH, GRADE_MAX_LENGTH } from "@/lib/grading";
import { getSession } from "@/lib/session";

/**
 * Califica el trabajo de un estudiante: guarda la nota (texto libre corto), el comentario
 * y el nombre de la misión, y lo deja en estado 'graded'. Desde ahí el estudiante ya no
 * puede modificarlo (save-work no actualiza trabajos calificados).
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  let body: { workId?: unknown; grade?: unknown; feedback?: unknown; missionTitle?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida." }, { status: 400 });
  }

  const workId = typeof body.workId === "string" ? body.workId : "";
  const grade = typeof body.grade === "string" ? body.grade.trim() : "";
  const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
  const missionTitle = typeof body.missionTitle === "string" ? body.missionTitle.trim().slice(0, 200) : "";

  if (!workId) {
    return NextResponse.json({ ok: false, message: "Falta el trabajo a calificar." }, { status: 400 });
  }
  if (!grade || grade.length > GRADE_MAX_LENGTH) {
    return NextResponse.json(
      { ok: false, message: `Escribe una calificación de máximo ${GRADE_MAX_LENGTH} caracteres.` },
      { status: 400 }
    );
  }
  if (feedback.length > FEEDBACK_MAX_LENGTH) {
    return NextResponse.json(
      { ok: false, message: `El comentario puede tener máximo ${FEEDBACK_MAX_LENGTH} caracteres.` },
      { status: 400 }
    );
  }

  try {
    const { rows } = await pool.query(
      `UPDATE student_works
         SET status = 'graded', grade = $1, feedback = $2, graded_at = now(),
             mission_title = COALESCE(NULLIF($3, ''), mission_title)
       WHERE id = $4 AND teacher_id = $5
       RETURNING graded_at`,
      [grade, feedback || null, missionTitle, workId, session.teacherId]
    );
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, message: "No se encontró el trabajo." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, gradedAt: (rows[0].graded_at as Date).toISOString() });
  } catch (e) {
    console.error("grade-work error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
