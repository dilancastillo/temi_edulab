import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

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

    await pool.query(
      `INSERT INTO student_works (id, teacher_id, institution_id, student_id, assignment_id, mission_id, workspace_state, step_index, status, updated_at, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (student_id, assignment_id) DO UPDATE SET
         workspace_state = EXCLUDED.workspace_state,
         step_index = EXCLUDED.step_index,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at,
         submitted_at = EXCLUDED.submitted_at`,
      [
        body.id, body.teacherId, body.institutionId, body.studentId,
        body.assignmentId, body.missionId,
        body.workspaceState ? JSON.stringify(body.workspaceState) : null,
        body.stepIndex, body.status, body.updatedAt, body.submittedAt ?? null
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("save-work error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
