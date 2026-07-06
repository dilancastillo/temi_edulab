import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  // Prefer JWT session (teacher viewing student) — fall back to query param (student viewing own data)
  const session = await getSession(req);
  const teacherId = session?.teacherId ?? searchParams.get("teacherId");

  if (!teacherId) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 }
    );
  }

  if (!studentId) {
    return NextResponse.json({ ok: false, message: "Faltan parámetros." }, { status: 400 });
  }

  const [studentRes, assignmentsRes, worksRes, teacherRes, missionsRes] = await Promise.all([
    pool.query("SELECT * FROM students WHERE id = $1", [studentId]),
    pool.query("SELECT * FROM assignments WHERE teacher_id = $1 AND status = 'active'", [teacherId]),
    pool.query("SELECT * FROM student_works WHERE student_id = $1", [studentId]),
    pool.query("SELECT robot_id FROM teachers WHERE id = $1", [teacherId]),
    pool.query("SELECT * FROM missions WHERE teacher_id = $1", [teacherId]),
  ]);

  return NextResponse.json({
    ok: true,
    student: studentRes.rows[0] ?? null,
    assignments: assignmentsRes.rows,
    studentWorks: worksRes.rows,
    robotId: (teacherRes.rows[0]?.robot_id as string | null) ?? null,
    missions: missionsRes.rows,
  });
}
