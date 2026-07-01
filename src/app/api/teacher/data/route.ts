import { NextRequest, NextResponse } from "next/server";
import {
  fetchStudents,
  fetchAssignments,
  fetchStudentWorks,
  fetchProfile,
  fetchCustomMissions,
} from "@/lib/db-store";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 }
    );
  }

  const teacherId = session.teacherId;

  const [students, assignments, studentWorks, profile, missions] = await Promise.all([
    fetchStudents(teacherId),
    fetchAssignments(teacherId),
    fetchStudentWorks(teacherId),
    fetchProfile(teacherId),
    fetchCustomMissions(teacherId),
  ]);

  return NextResponse.json({ ok: true, students, assignments, studentWorks, profile, missions });
}
