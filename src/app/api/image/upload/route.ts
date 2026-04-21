import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const BUCKET_NAME = "images";

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ ok: false, message: "No image file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ ok: false, message: "Image exceeds 50 MB limit" }, { status: 413 });
  }

  try {
    const id = generateId();
    const fileName = `${id}-${file.name}`;
    const buffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, new Uint8Array(buffer), {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ ok: false, message: "Error uploading image to storage" }, { status: 500 });
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    return NextResponse.json({ ok: true, id, imageUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ ok: false, message: "Error processing image upload" }, { status: 500 });
  }
}
