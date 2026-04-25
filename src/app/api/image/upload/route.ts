import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "images");

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  const teacherId = formData.get("teacherId") as string | null;

  if (!file) {
    return NextResponse.json({ ok: false, message: "No image file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ ok: false, message: "Image exceeds 50 MB limit" }, { status: 413 });
  }

  try {
    const id = generateId();
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${id}.${ext}`;

    // Save to disk
    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

    const imageUrl = `/uploads/images/${fileName}`;

    // Save to DB if teacherId provided
    if (teacherId) {
      await pool.query(
        "INSERT INTO images (id, teacher_id, filename, url, size_bytes) VALUES ($1,$2,$3,$4,$5)",
        [id, teacherId, file.name, imageUrl, file.size]
      );
    }

    return NextResponse.json({ ok: true, id, imageUrl });
  } catch (e) {
    console.error("image upload error:", e);
    return NextResponse.json({ ok: false, message: "Error uploading image" }, { status: 500 });
  }
}
