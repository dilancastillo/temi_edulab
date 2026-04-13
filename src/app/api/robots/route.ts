import { NextResponse } from "next/server";
import { callBackend } from "@/lib/server/backend";
import { getSessionToken } from "@/lib/server/auth-cookie";
import { toRouteErrorResponse } from "@/lib/server/route-response";

export async function GET() {
  try {
    const token = await getSessionToken();
    const result = await callBackend("/v1/robots", {
      token
    });

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
