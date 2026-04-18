import { NextResponse } from "next/server";
import { getUpload } from "@/lib/upload-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const uploaded = getUpload(id);

  if (!uploaded) {
    return NextResponse.json({ ok: false, error: "Upload expired or not found." }, { status: 404 });
  }

  const matches = uploaded.dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    return NextResponse.json({ ok: false, error: "Stored upload is invalid." }, { status: 500 });
  }

  const [, contentType, base64] = matches;
  const buffer = Buffer.from(base64, "base64");

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
}
