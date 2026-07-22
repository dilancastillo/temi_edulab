import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Tracks { attempts, windowStart } per IP address.
// Max 5 failures within a 15-minute (900 s) sliding window.

interface RateEntry {
  attempts: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateEntry>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) return false;
  if (now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.delete(ip);
    return false;
  }
  return entry.attempts >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { attempts: 1, windowStart: now });
  } else {
    entry.attempts += 1;
  }
}

function resetFailures(ip: string): void {
  rateLimitMap.delete(ip);
}

// ── Handler ───────────────────────────────────────────────────────────────────

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set.");
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Rate-limit check before touching the DB
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, message: "Demasiados intentos fallidos. Intenta de nuevo en 5 minutos." },
      {
        status: 429,
        headers: { "Retry-After": "300" },
      }
    );
  }

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
      recordFailure(ip);
      return NextResponse.json(
        { ok: false, message: "Correo o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const teacher = rows[0] as {
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      institution_id: string;
    };

    const valid = await bcrypt.compare(password, teacher.password_hash);

    if (!valid) {
      recordFailure(ip);
      return NextResponse.json(
        { ok: false, message: "Correo o contraseña incorrectos." },
        { status: 401 }
      );
    }

    // Successful login — reset failure counter
    resetFailures(ip);

    // Sign JWT — 2 hour expiration
    const token = await new SignJWT({
      teacherId: teacher.id,
      email: teacher.email,
      institutionId: teacher.institution_id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("2h")
      .sign(secret);

    // Build response with session cookie (7200 = 2 hours)
    const response = NextResponse.json({ ok: true, fullName: teacher.full_name });
    response.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 7200,
    });

    return response;
  } catch (e) {
    console.error("auth/login error:", e);
    return NextResponse.json(
      { ok: false, message: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
