import { NextRequest, NextResponse } from "next/server";
import { upsertProfile } from "@/lib/db-store";
import type { TeacherProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const profile = await req.json() as TeacherProfile;
    await upsertProfile(profile);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("update-profile error:", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}
