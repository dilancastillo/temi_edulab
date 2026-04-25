import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");
  const studentId = searchParams.get("studentId");

  if (!teacherId || !studentId) {
    return NextResponse.json({ ok: false, message: "Faltan parámetros." }, { status: 400 });
  }

  const [studentRes, assignmentsRes, worksRes] = await Promise.all([
    pool.query("SELECT * FROM students WHERE id = $1", [studentId]),
    pool.query("SELECT * FROM assignments WHERE teacher_id = $1 AND status = 'active'", [teacherId]),
    pool.query("SELECT * FROM student_works WHERE student_id = $1", [studentId]),
  ]);

  return NextResponse.json({
    ok: true,
    student: studentRes.rows[0] ?? null,
    assignments: assignmentsRes.rows,
    studentWorks: worksRes.rows,
  });
}
