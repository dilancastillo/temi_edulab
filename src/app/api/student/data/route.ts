import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  // Se exige una sesión de docente o el teacherId de la sesión del estudiante (igual que antes).
  const session = await getSession(req);
  if (!session && !searchParams.get("teacherId")) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 }
    );
  }

  if (!studentId) {
    return NextResponse.json({ ok: false, message: "Faltan parámetros." }, { status: 400 });
  }

  try {
    const studentRes = await pool.query("SELECT * FROM students WHERE id = $1", [studentId]);
    const student = studentRes.rows[0] as Record<string, unknown> | undefined;
    if (!student) {
      return NextResponse.json({ ok: false, message: "Estudiante no encontrado." }, { status: 404 });
    }

    // El docente se toma del propio estudiante, no de la cookie ni de la URL: en un navegador
    // donde también hay un docente conectado (otra pestaña), la cookie es de ese docente y el
    // estudiante recibía misiones y asignaciones que no eran las suyas (su panel quedaba vacío).
    const teacherId = student.teacher_id as string;

    const [assignmentsRes, worksRes, teacherRes, missionsRes] = await Promise.all([
      pool.query("SELECT * FROM assignments WHERE teacher_id = $1 AND status = 'active'", [teacherId]),
      pool.query("SELECT * FROM student_works WHERE student_id = $1", [studentId]),
      pool.query("SELECT robot_id, full_name, email FROM teachers WHERE id = $1", [teacherId]),
      pool.query("SELECT * FROM missions WHERE teacher_id = $1", [teacherId]),
    ]);

    return NextResponse.json({
      ok: true,
      student,
      assignments: assignmentsRes.rows,
      studentWorks: worksRes.rows,
      robotId: (teacherRes.rows[0]?.robot_id as string | null) ?? null,
      // Para que el estudiante (y quien lo acompañe) sepa de qué docente es.
      teacher: teacherRes.rows[0]
        ? { fullName: (teacherRes.rows[0].full_name as string | null) ?? "", email: teacherRes.rows[0].email as string }
        : null,
      missions: missionsRes.rows,
    });
  } catch (e) {
    console.error("student/data error:", e);
    return NextResponse.json({ ok: false, message: "Error interno del servidor." }, { status: 500 });
  }
}
