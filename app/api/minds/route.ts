import { NextResponse } from "next/server";
import { z } from "zod";
import { mindsClient } from "@/lib/clients/minds";

const mindsInput = z.object({
  url: z.string().url(),
  niche: z.string().min(2),
  trends: z.unknown().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = mindsInput.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { url, niche, trends } = parsed.data;
    const result = await mindsClient.reviewBrand({ url, niche, trends });

    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Minds AI failed" },
      { status: 500 },
    );
  }
}
