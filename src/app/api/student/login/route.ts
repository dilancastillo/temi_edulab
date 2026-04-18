import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { missionCode?: string; studentName?: string; email?: string; password?: string };

    // ── Login por código de misión + nombre ──────────────────────────────────
    if (body.missionCode && body.studentName) {
      const code = body.missionCode.trim().toUpperCase();
      const name = body.studentName.trim().toLowerCase();

      // 1. Buscar la asignación activa con ese código
      const { data: assignment, error: assignError } = await supabase
        .from("assignments")
        .select("id, course_id, mission_id, teacher_id")
        .eq("mission_code", code)
        .eq("status", "active")
        .single();

      if (assignError || !assignment) {
        return NextResponse.json({ ok: false, message: "Código de misión no válido o inactivo." }, { status: 401 });
      }

      // 2. Buscar el estudiante por nombre (case-insensitive) en ese curso
      const { data: students, error: studentError } = await supabase
        .from("students")
        .select("id, full_name, course_id, teacher_id")
        .eq("course_id", assignment.course_id)
        .ilike("full_name", name);

      if (studentError || !students || students.length === 0) {
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

      const { data: students, error } = await supabase
        .from("students")
        .select("id, full_name, email, password, teacher_id, course_id")
        .eq("email", email)
        .single();

      if (error || !students) {
        return NextResponse.json({ ok: false, message: "Correo o contraseña incorrectos." }, { status: 401 });
      }

      const student = students as { id: string; full_name: string; email: string; password: string; teacher_id: string; course_id: string };

      if (student.password !== body.password) {
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
  } catch {
    return NextResponse.json({ ok: false, message: "Error interno del servidor." }, { status: 500 });
  }
}
