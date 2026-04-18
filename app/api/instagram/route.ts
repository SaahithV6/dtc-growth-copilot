import { NextResponse } from "next/server";
import { z } from "zod";
import { instagramClient } from "@/lib/clients/instagram";

const instagramPublishSchema = z.object({
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).max(30).optional(),
});

function formatCaption(caption: string, hashtags: string[] = []) {
  const cleanedTags = hashtags
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 30)
    .map((tag) => `#${tag}`);

  if (!cleanedTags.length) {
    return caption.trim();
  }

  return `${caption.trim()}\n\n${cleanedTags.join(" ")}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = instagramPublishSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    if (!instagramClient.hasCredentials()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in your environment to enable auto-posting",
          postingEnabled: false,
        },
        { status: 400 },
      );
    }

    const { imageUrl, videoUrl, caption, hashtags } = parsed.data;
    const composedCaption = formatCaption(caption, hashtags);

    if (!imageUrl && !videoUrl) {
      return NextResponse.json(
        { ok: false, error: "Provide imageUrl or videoUrl." },
        { status: 400 },
      );
    }

    const result = videoUrl
      ? await instagramClient.publishReel(videoUrl, composedCaption)
      : await instagramClient.publishPhoto(String(imageUrl), composedCaption);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "Instagram publish failed" },
        { status: 500 },
      );
    }

    const permalink = result.mediaId
      ? await instagramClient.getMediaPermalink(result.mediaId)
      : null;

    return NextResponse.json({
      ok: true,
      mediaId: result.mediaId,
      permalink,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Instagram publish failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  if (!instagramClient.hasCredentials()) {
    return NextResponse.json({
      ok: true,
      postingEnabled: false,
      message:
        "Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in your environment to enable auto-posting",
    });
  }

  try {
    const account = await instagramClient.getAccountInfo();
    return NextResponse.json({ ok: true, postingEnabled: true, account });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        postingEnabled: false,
        error: err instanceof Error ? err.message : "Failed to fetch Instagram account",
      },
      { status: 500 },
    );
  }
}
