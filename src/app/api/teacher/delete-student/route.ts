import { NextRequest, NextResponse } from "next/server";
import { deleteStudentById } from "@/lib/db-store";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json() as { id: string };
    await deleteStudentById(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete-student error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
