import { NextResponse } from "next/server";
import { z } from "zod";
import { apifyClient } from "@/lib/clients/apify";

const scrapeInput = z.object({
  url: z.string().url(),
  niche: z.string().min(2),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = scrapeInput.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { url, niche } = parsed.data;
    const result = await apifyClient.scrapeAll(url, niche);

    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 500 },
    );
  }
}
