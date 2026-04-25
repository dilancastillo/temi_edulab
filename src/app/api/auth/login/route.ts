import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ ok: false, message: "Datos incompletos." }, { status: 400 });
    }

    const { rows } = await pool.query(
      "SELECT id, email, password_hash, full_name, institution_id FROM teachers WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, message: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    const teacher = rows[0] as { id: string; email: string; password_hash: string; full_name: string; institution_id: string };
    const valid = await bcrypt.compare(password, teacher.password_hash);

    if (!valid) {
      return NextResponse.json({ ok: false, message: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      teacherId: teacher.id,
      email: teacher.email,
      fullName: teacher.full_name,
      institutionId: teacher.institution_id,
    });
  } catch (e) {
    console.error("auth/login error:", e);
    return NextResponse.json({ ok: false, message: "Error interno del servidor." }, { status: 500 });
  }
}
