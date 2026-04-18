import { apifyClient } from "@/lib/clients/apify";
import { mindsClient } from "@/lib/clients/minds";
import { pixeroClient } from "@/lib/clients/pixero";
import type { CampaignResult, ScrapeResult } from "@/lib/schemas/campaign";

export interface OrchestratorInput {
  url: string;
  niche: string;
}

/**
 * Main orchestration pipeline — coordinates all agents:
 * 1. Scrape (Apify: TikTok, Instagram, Shopify in parallel)
 * 2. Brand Twin Review (Minds AI)
 * 3. Ad Generation (Pixero)
 * 4. Compile action items
 */
export async function runCampaign(
  input: OrchestratorInput,
): Promise<CampaignResult> {
  const { url, niche } = input;

  /* ── Step 1: Scrape ──────────────────────────────────────── */
  let scrape: ScrapeResult;
  try {
    scrape = await apifyClient.scrapeAll(url, niche);
  } catch {
    scrape = {
      tiktok: { status: "error", error: "Scrape failed" },
      instagram: { status: "error", error: "Scrape failed" },
      shopify: { status: "error", error: "Scrape failed" },
    };
  }

  /* ── Step 2: Brand Twin Review (Minds AI) ────────────────── */
  const brandTwin = await mindsClient.reviewBrand({
    url,
    niche,
    trends: scrape,
  });

  /* ── Step 3: Ad Generation (Pixero) ──────────────────────── */
  const ads = await pixeroClient.generateAds({
    url,
    niche,
    trends: scrape,
    brandReview: brandTwin,
  });

  /* ── Step 4: Compile action items ────────────────────────── */
  const actionItems = compileActionItems(scrape, brandTwin, ads);

  return {
    scrape,
    brandTwin,
    ads,
    actionItems,
    timestamp: new Date().toISOString(),
  };
}

function compileActionItems(
  scrape: ScrapeResult,
  brandTwin: CampaignResult["brandTwin"],
  ads: CampaignResult["ads"],
): string[] {
  const items: string[] = [];

  // From scrape data
  if (scrape.tiktok.status === "success" && scrape.tiktok.trends?.length) {
    items.push(
      `📱 ${scrape.tiktok.trends.length} TikTok trends found — create UGC content aligned with trending formats`,
    );
  }
  if (
    scrape.instagram.status === "success" &&
    scrape.instagram.posts?.length
  ) {
    items.push(
      `📸 ${scrape.instagram.posts.length} competitor Instagram posts analyzed — adapt top-performing content styles`,
    );
  }
  if (
    scrape.shopify.status === "success" &&
    scrape.shopify.products?.length
  ) {
    items.push(
      `🛍️ ${scrape.shopify.products.length} products scraped — prioritize hero product for initial campaign`,
    );
  }

  // From brand twin
  if (brandTwin?.feedback?.improvements?.length) {
    brandTwin.feedback.improvements.slice(0, 3).forEach((imp) => {
      items.push(`💡 ${imp}`);
    });
  }

  // From ads
  if (ads?.creatives?.length) {
    items.push(
      `🎨 ${ads.creatives.length} ad creatives ready — launch A/B tests on Meta`,
    );
  }
  if (ads?.budget) {
    items.push(`💰 Recommended budget: ${ads.budget.daily} daily for ${ads.budget.duration}`);
  }

  // Always include
  items.push("📊 Set up conversion tracking (Meta Pixel + CAPI) before launch");
  items.push("🔄 Review campaign performance after 7 days and iterate");

  return items;
}
