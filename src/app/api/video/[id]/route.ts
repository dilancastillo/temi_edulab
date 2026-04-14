import { NextRequest, NextResponse } from "next/server";
import { videoStore } from "@/lib/video-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = videoStore.get(id);
  if (!entry) {
    return new NextResponse("Video not found", { status: 404 });
  }
  return new NextResponse(entry.buffer, {
    headers: {
      "Content-Type": entry.mimeType,
      "Content-Length": entry.buffer.byteLength.toString(),
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
