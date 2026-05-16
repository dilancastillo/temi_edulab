import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { teacherId } = await req.json() as { teacherId: string };
    await pool.query(
      "DELETE FROM student_works WHERE teacher_id = $1 AND assignment_id = 'free-play'",
      [teacherId]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete-free-play-works error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
