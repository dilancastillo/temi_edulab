import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json() as { id: string };

    // Get the assignment to find the course
    const { rows } = await pool.query(
      "SELECT course_id FROM assignments WHERE id = $1",
      [id]
    );

    if (rows.length > 0) {
      const courseId = (rows[0] as { course_id: string }).course_id;

      // Reset progress of students in that course back to "En curso"
      await pool.query(
        "UPDATE students SET progress = 'En curso', current_mission_id = NULL WHERE course_id = $1 AND progress = 'Revisar'",
        [courseId]
      );
    }

    // Delete the assignment (cascade will delete student_works)
    await pool.query("DELETE FROM assignments WHERE id = $1", [id]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete-assignment error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
