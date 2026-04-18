import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");
  const studentId = searchParams.get("studentId");

  if (!teacherId || !studentId) {
    return NextResponse.json({ ok: false, message: "Faltan parámetros." }, { status: 400 });
  }

  const [studentRes, assignmentsRes, worksRes] = await Promise.all([
    supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single(),
    supabase
      .from("assignments")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("status", "active"),
    supabase
      .from("student_works")
      .select("*")
      .eq("student_id", studentId),
  ]);

  return NextResponse.json({
    ok: true,
    student: studentRes.data ?? null,
    assignments: assignmentsRes.data ?? [],
    studentWorks: worksRes.data ?? [],
  });
}
