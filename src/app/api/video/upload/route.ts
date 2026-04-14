import { NextRequest, NextResponse } from "next/server";
import { videoStore } from "@/lib/video-store";
import { networkInterfaces } from "os";

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getLocalIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("video") as File | null;

  if (!file) {
    return NextResponse.json({ ok: false, message: "No video file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ ok: false, message: "Video exceeds 200 MB limit" }, { status: 413 });
  }

  const buffer = await file.arrayBuffer();
  const id = generateId();

  videoStore.set(id, {
    buffer,
    mimeType: file.type || "video/mp4",
    filename: file.name,
  });

  // Build the video URL using the real network IP of the PC
  const localIP = getLocalIP();
  const port = req.headers.get("host")?.split(":")[1] ?? "3000";
  const videoUrl = `http://${localIP}:${port}/api/video/${id}`;

  return NextResponse.json({ ok: true, id, videoUrl });
}
