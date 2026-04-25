import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, institutionId } = await req.json() as {
      email: string;
      password: string;
      fullName: string;
      institutionId?: string;
    };

    if (!email || !password || !fullName) {
      return NextResponse.json({ ok: false, message: "Faltan campos obligatorios." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ ok: false, message: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    // Check if email already exists
    const { rows: existing } = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (existing.length > 0) {
      return NextResponse.json({ ok: false, message: "Ya existe una cuenta con ese correo." }, { status: 409 });
    }

    const id = generateId();
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO teachers (id, email, password_hash, full_name, institution_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, email.trim().toLowerCase(), passwordHash, fullName.trim(), institutionId ?? ""]
    );

    return NextResponse.json({ ok: true, teacherId: id });
  } catch (e) {
    console.error("auth/register error:", e);
    return NextResponse.json({ ok: false, message: "Error interno del servidor." }, { status: 500 });
  }
}
