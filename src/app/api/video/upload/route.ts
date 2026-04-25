import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "videos");

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("video") as File | null;
  const teacherId = formData.get("teacherId") as string | null;

  if (!file) {
    return NextResponse.json({ ok: false, message: "No video file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ ok: false, message: "Video exceeds 200 MB limit" }, { status: 413 });
  }

  try {
    const id = generateId();
    const ext = file.name.split(".").pop() ?? "mp4";
    const fileName = `${id}.${ext}`;

    // Save to disk
    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

    const videoUrl = `/uploads/videos/${fileName}`;

    // Save to DB if teacherId provided
    if (teacherId) {
      await pool.query(
        "INSERT INTO videos (id, teacher_id, filename, url, size_bytes) VALUES ($1,$2,$3,$4,$5)",
        [id, teacherId, file.name, videoUrl, file.size]
      );
    }

    return NextResponse.json({ ok: true, id, videoUrl });
  } catch (e) {
    console.error("video upload error:", e);
    return NextResponse.json({ ok: false, message: "Error uploading video" }, { status: 500 });
  }
}
