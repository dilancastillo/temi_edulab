import { NextRequest, NextResponse } from "next/server";
import { callBackend } from "@/lib/server/backend";
import { getSessionToken } from "@/lib/server/auth-cookie";
import { toRouteErrorResponse } from "@/lib/server/route-response";

export async function PATCH(request: NextRequest) {
  try {
    const token = await getSessionToken();
    const body = await request.json();
    const result = await callBackend("/v1/profile", {
      method: "PATCH",
      body,
      token
    });

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
