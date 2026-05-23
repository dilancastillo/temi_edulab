import { NextRequest, NextResponse } from "next/server";
import {
  fetchStudents,
  fetchAssignments,
  fetchStudentWorks,
  fetchProfile,
  fetchCustomMissions,
} from "@/lib/db-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");

  if (!teacherId) {
    return NextResponse.json({ ok: false, message: "Falta teacherId." }, { status: 400 });
  }

  const [students, assignments, studentWorks, profile, missions] = await Promise.all([
    fetchStudents(teacherId),
    fetchAssignments(teacherId),
    fetchStudentWorks(teacherId),
    fetchProfile(teacherId),
    fetchCustomMissions(teacherId),
  ]);

  return NextResponse.json({ ok: true, students, assignments, studentWorks, profile, missions });
}
