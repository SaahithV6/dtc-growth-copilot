import { NextResponse } from "next/server";
import { saveUpload } from "@/lib/upload-store";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Upload a file using field name 'file'." },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Only JPG, PNG, WEBP, and MP4 files are supported." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    const id = saveUpload(dataUrl, file.type);
    const origin = new URL(request.url).origin;
    const publicUrl = `${origin}/api/upload/${id}`;

    return NextResponse.json({
      ok: true,
      id,
      url: publicUrl,
      contentType: file.type,
      name: file.name,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}
