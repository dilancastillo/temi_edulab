import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

// Startup validation — fail loudly if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is not set. " +
      "Add a JWT_SECRET=<64-hex-chars> entry to .env.local and restart the server."
  );
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface SessionPayload {
  teacherId: string;
  email: string;
  institutionId: string;
}

/**
 * Reads the `session` cookie from the request, verifies the JWT signature,
 * and returns the payload, or `null` if the cookie is absent or invalid.
 */
export async function getSession(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const { teacherId, email, institutionId } = payload as Record<string, unknown>;
    if (
      typeof teacherId !== "string" ||
      typeof email !== "string" ||
      typeof institutionId !== "string"
    ) {
      return null;
    }
    return { teacherId, email, institutionId };
  } catch {
    return null;
  }
}
