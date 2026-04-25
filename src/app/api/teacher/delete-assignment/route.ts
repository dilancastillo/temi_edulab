import { NextRequest, NextResponse } from "next/server";
import { deleteAssignmentById } from "@/lib/db-store";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json() as { id: string };
    await deleteAssignmentById(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete-assignment error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
