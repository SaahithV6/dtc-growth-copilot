import { NextResponse } from "next/server";
import { z } from "zod";
import { pixeroClient } from "@/lib/clients/pixero";

const pixeroInput = z.object({
  url: z.string().url(),
  niche: z.string().min(2),
  trends: z.unknown().optional(),
  brandReview: z.unknown().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = pixeroInput.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { url, niche, trends, brandReview } = parsed.data;
    const result = await pixeroClient.generateAds({
      url,
      niche,
      trends: trends ?? {},
      brandReview: brandReview ?? {},
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Pixero failed" },
      { status: 500 },
    );
  }
}
