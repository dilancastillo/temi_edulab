import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { missionCode?: string; studentName?: string; email?: string; password?: string };

    // ── Login por código de misión + nombre ──────────────────────────────────
    if (body.missionCode && body.studentName) {
      const code = body.missionCode.trim().toUpperCase();
      const name = body.studentName.trim().toLowerCase();

      const { rows: assignments } = await pool.query(
        "SELECT id, course_id, mission_id, teacher_id FROM assignments WHERE mission_code = $1 AND status = 'active'",
        [code]
      );

      if (assignments.length === 0) {
        return NextResponse.json({ ok: false, message: "Código de misión no válido o inactivo." }, { status: 401 });
      }

      const assignment = assignments[0] as { id: string; course_id: string; mission_id: string; teacher_id: string };

      const { rows: students } = await pool.query(
        "SELECT id, full_name, course_id, teacher_id FROM students WHERE course_id = $1 AND LOWER(full_name) = $2",
        [assignment.course_id, name]
      );

      if (students.length === 0) {
        return NextResponse.json({ ok: false, message: "No encontramos un estudiante con ese nombre en este curso." }, { status: 401 });
      }

      const student = students[0] as { id: string; full_name: string; course_id: string; teacher_id: string };

      return NextResponse.json({
        ok: true,
        studentId: student.id,
        displayName: student.full_name,
        teacherId: student.teacher_id,
        assignmentId: assignment.id,
        missionId: assignment.mission_id,
      });
    }

    // ── Login por correo + contraseña ────────────────────────────────────────
    if (body.email && body.password) {
      const email = body.email.trim().toLowerCase();

      const { rows } = await pool.query(
        "SELECT id, full_name, email, password, teacher_id, course_id FROM students WHERE email = $1",
        [email]
      );

      if (rows.length === 0) {
        return NextResponse.json({ ok: false, message: "Correo o contraseña incorrectos." }, { status: 401 });
      }

      const student = rows[0] as { id: string; full_name: string; email: string; password: string; teacher_id: string; course_id: string };
      const valid = await bcrypt.compare(body.password, student.password);

      if (!valid) {
        return NextResponse.json({ ok: false, message: "Correo o contraseña incorrectos." }, { status: 401 });
      }

      return NextResponse.json({
        ok: true,
        studentId: student.id,
        displayName: student.full_name,
        teacherId: student.teacher_id,
      });
    }

    return NextResponse.json({ ok: false, message: "Datos incompletos." }, { status: 400 });
  } catch (e) {
    console.error("student/login error:", e);
    return NextResponse.json({ ok: false, message: "Error interno del servidor." }, { status: 500 });
  }
}
