import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      id: string;
      teacherId: string;
      institutionId: string;
      courseId: string;
      fullName: string;
      email: string;
      password: string;
      progress: string;
      avatarUrl?: string;
      createdAt: string;
    };

    const hashedPassword = await bcrypt.hash(body.password, 10);

    await pool.query(
      `INSERT INTO students (id, teacher_id, institution_id, course_id, full_name, email, password, progress, avatar_url, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         course_id = EXCLUDED.course_id,
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         password = EXCLUDED.password,
         progress = EXCLUDED.progress,
         avatar_url = EXCLUDED.avatar_url`,
      [
        body.id, body.teacherId, body.institutionId, body.courseId,
        body.fullName, body.email, hashedPassword, body.progress,
        body.avatarUrl ?? null, body.createdAt
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("create student error:", e);
    return NextResponse.json({ ok: false, message: "Error al crear estudiante" }, { status: 500 });
  }
}
