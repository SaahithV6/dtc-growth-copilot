import { NextResponse } from "next/server";
import { runRequestSchema } from "@/lib/schemas/run";
import { apifyClient } from "@/lib/clients/apify";
import { mindsClient } from "@/lib/clients/minds";
import { pixeroClient } from "@/lib/clients/pixero";
import { elevenLabsClient } from "@/lib/clients/elevenlabs";

export async function POST(request: Request) {
  const data = Object.fromEntries(await request.formData());
  const parsed = runRequestSchema.safeParse(data);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { url, niche } = parsed.data;

  const trends = await apifyClient.getTrends({ url, niche });
  const brandReview = await mindsClient.reviewBrand({ url, niche, trends });
  const ads = await pixeroClient.generateAds({ url, niche, trends, brandReview });
  const voiceover = await elevenLabsClient.optionalVoiceover({ ads });

  return NextResponse.json({
    ok: true,
    data: {
      trends,
      brandReview,
      ads,
      voiceover,
    },
  });
}
