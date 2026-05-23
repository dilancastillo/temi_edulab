import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json() as { id: string };
    await pool.query("DELETE FROM missions WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete-mission error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
