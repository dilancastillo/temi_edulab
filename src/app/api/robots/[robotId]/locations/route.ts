import { NextResponse } from "next/server";
import { callBackend } from "@/lib/server/backend";
import { getSessionToken } from "@/lib/server/auth-cookie";
import { toRouteErrorResponse } from "@/lib/server/route-response";

type RouteContext = {
  params: Promise<{ robotId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const token = await getSessionToken();
    const { robotId } = await context.params;
    const result = await callBackend(`/v1/robots/${robotId}/locations`, {
      token
    });

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
