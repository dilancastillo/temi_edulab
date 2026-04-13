import { NextResponse } from "next/server";
import { emptyBootstrap } from "@/lib/empty-bootstrap";
import { callBackend } from "@/lib/server/backend";
import { getSessionToken } from "@/lib/server/auth-cookie";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(emptyBootstrap);
  }

  try {
    const bootstrap = await callBackend("/v1/bootstrap", { token });
    return NextResponse.json(bootstrap);
  } catch {
    return NextResponse.json(emptyBootstrap);
  }
}
