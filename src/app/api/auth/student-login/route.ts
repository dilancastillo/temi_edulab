import { NextRequest, NextResponse } from "next/server";
import { callBackend } from "@/lib/server/backend";
import { setSessionToken } from "@/lib/server/auth-cookie";
import { toRouteErrorResponse } from "@/lib/server/route-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callBackend<{ token: string }>("/v1/auth/student-login", {
      method: "POST",
      body
    });

    await setSessionToken(result.token);

    const bootstrap = await callBackend("/v1/bootstrap", {
      token: result.token
    });

    return NextResponse.json(bootstrap);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
