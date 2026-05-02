import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/server/auth-cookie";
import { callBackend } from "@/lib/server/backend";
import { toRouteErrorResponse } from "@/lib/server/route-response";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const bootstrap = await callBackend("/v1/institution/branding", {
      method: "PATCH",
      body,
      token: await getSessionToken()
    });

    return NextResponse.json(bootstrap);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
