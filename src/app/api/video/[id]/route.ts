import { NextRequest, NextResponse } from "next/server";
import { videoStore } from "@/lib/video-store";

const ALLOWED_ORIGINS = [
  "https://edulab.esbot.co",
  "http://localhost:3000",
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = videoStore.get(id);
  if (!entry) {
    return new NextResponse("Video not found", { status: 404 });
  }

  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return new NextResponse(entry.buffer, {
    headers: {
      "Content-Type": entry.mimeType,
      "Content-Length": entry.buffer.byteLength.toString(),
      "Access-Control-Allow-Origin": allowedOrigin,
      "Cache-Control": "no-store",
    },
  });
}
