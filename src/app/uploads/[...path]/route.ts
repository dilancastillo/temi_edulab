import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".mov":  "video/quicktime",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".PNG":  "image/png",
  ".JPG":  "image/jpeg",
  ".JPEG": "image/jpeg",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  try {
    const segments = (await params).path;

    // Only allow uploads/images and uploads/videos subdirectories
    if (!segments || segments.length < 2) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [subdir, ...rest] = segments;
    if (subdir !== "images" && subdir !== "videos") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const fileName = rest.join("/");
    const filePath = path.join(process.cwd(), "public", "uploads", subdir, fileName);

    // Prevent path traversal
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    if (!filePath.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(fileName);
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: unknown) {
    const isNotFound = e instanceof Error && "code" in e && (e as NodeJS.ErrnoException).code === "ENOENT";
    if (isNotFound) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("uploads route error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
