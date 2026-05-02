import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/server/auth-cookie";
import { callBackend } from "@/lib/server/backend";
import { toRouteErrorResponse } from "@/lib/server/route-response";

type RouteContext = {
  params: Promise<{ policyId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const body = await request.json();
    const { policyId } = await context.params;
    const bootstrap = await callBackend(`/v1/institution/policies/${policyId}/publish`, {
      method: "POST",
      body,
      token: await getSessionToken()
    });

    return NextResponse.json(bootstrap);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
