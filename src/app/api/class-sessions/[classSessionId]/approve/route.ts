import { NextRequest, NextResponse } from "next/server";
import { callBackend } from "@/lib/server/backend";
import { getSessionToken } from "@/lib/server/auth-cookie";
import { toRouteErrorResponse } from "@/lib/server/route-response";

type RouteContext = {
  params: Promise<{ classSessionId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const token = await getSessionToken();
    const { classSessionId } = await context.params;
    const result = await callBackend(`/v1/class-sessions/${classSessionId}/approve`, {
      method: "POST",
      token
    });

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
