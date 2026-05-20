import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { FREE_PLAY_ASSIGNMENT_ID } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { teacherId } = await req.json() as { teacherId: string };
    if (!teacherId) {
      return NextResponse.json({ ok: false, message: "Falta teacherId." }, { status: 400 });
    }
    await pool.query(
      "DELETE FROM student_works WHERE teacher_id = $1 AND assignment_id = $2",
      [teacherId, FREE_PLAY_ASSIGNMENT_ID]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete-free-play error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
