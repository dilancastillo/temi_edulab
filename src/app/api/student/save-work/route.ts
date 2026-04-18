import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      id: string;
      teacherId: string;
      institutionId: string;
      studentId: string;
      assignmentId: string;
      missionId: string;
      workspaceState: unknown;
      stepIndex: number;
      status: "draft" | "submitted";
      updatedAt: string;
      submittedAt?: string;
    };

    const row: Record<string, unknown> = {
      teacher_id: body.teacherId,
      institution_id: body.institutionId,
      student_id: body.studentId,
      assignment_id: body.assignmentId,
      mission_id: body.missionId,
      workspace_state: body.workspaceState ?? null,
      step_index: body.stepIndex,
      status: body.status,
      updated_at: body.updatedAt,
      submitted_at: body.submittedAt ?? null,
    };

    // Include id when provided so Supabase can match the existing row by PK
    if (body.id) row.id = body.id;

    const { error } = await supabase.from("student_works").upsert(row, { onConflict: "student_id,assignment_id" });

    if (error) {
      console.error("save-work error:", error);
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("save-work exception:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
