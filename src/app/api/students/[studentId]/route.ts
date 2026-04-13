import { NextRequest, NextResponse } from "next/server";
import { callBackend } from "@/lib/server/backend";
import { getSessionToken } from "@/lib/server/auth-cookie";
import { toRouteErrorResponse } from "@/lib/server/route-response";

type RouteContext = {
  params: Promise<{ studentId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const token = await getSessionToken();
    const body = await request.json();
    const { studentId } = await context.params;
    const result = await callBackend(`/v1/students/${studentId}`, {
      method: "PATCH",
      body,
      token
    });

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const token = await getSessionToken();
    const { studentId } = await context.params;
    const result = await callBackend(`/v1/students/${studentId}`, {
      method: "DELETE",
      token
    });

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
