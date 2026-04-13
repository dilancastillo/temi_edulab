import { NextResponse } from "next/server";
import { BackendError } from "@/lib/server/backend";

export function toRouteErrorResponse(error: unknown) {
  if (error instanceof BackendError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "No pudimos completar la solicitud." }, { status: 500 });
}
