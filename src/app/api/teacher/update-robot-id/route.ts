import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { teacherId, robotId } = await req.json() as { teacherId: string; robotId: string };
    if (!teacherId) {
      return NextResponse.json({ ok: false, message: "Falta teacherId." }, { status: 400 });
    }
    await pool.query(
      "UPDATE teachers SET robot_id = $1 WHERE id = $2",
      [robotId || null, teacherId]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("update-robot-id error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
