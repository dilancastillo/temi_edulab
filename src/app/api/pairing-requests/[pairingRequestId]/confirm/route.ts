import { NextRequest, NextResponse } from "next/server";
import { callBackend } from "@/lib/server/backend";
import { getSessionToken } from "@/lib/server/auth-cookie";
import { toRouteErrorResponse } from "@/lib/server/route-response";

type RouteContext = {
  params: Promise<{ pairingRequestId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const token = await getSessionToken();
    const body = await request.json();
    const { pairingRequestId } = await context.params;
    const result = await callBackend(`/v1/pairing-requests/${pairingRequestId}/confirm`, {
      method: "POST",
      body,
      token
    });

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
