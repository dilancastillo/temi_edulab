import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { networkInterfaces } from "os";

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const BUCKET_NAME = "videos";

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

  try {
    const id = generateId();
    const fileName = `${id}-${file.name}`;
    const buffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, new Uint8Array(buffer), {
        contentType: file.type || "video/mp4",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ ok: false, message: "Error uploading video to storage" }, { status: 500 });
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const videoUrl = publicUrlData.publicUrl;

    return NextResponse.json({ ok: true, id, videoUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ ok: false, message: "Error processing video upload" }, { status: 500 });
  }
}
