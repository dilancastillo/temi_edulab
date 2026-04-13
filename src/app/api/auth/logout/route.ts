import { NextResponse } from "next/server";
import { callBackend } from "@/lib/server/backend";
import { clearSessionToken, getSessionToken } from "@/lib/server/auth-cookie";

export async function POST() {
  const token = await getSessionToken();

  if (token) {
    try {
      await callBackend("/v1/auth/logout", {
        method: "POST",
        token
      });
    } catch {
      // Best effort logout on the backend; the browser cookie is still cleared.
    }
  }

  await clearSessionToken();
  return NextResponse.json({ ok: true });
}
