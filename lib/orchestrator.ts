import { apifyClient } from "@/lib/clients/apify";
import { mindsClient } from "@/lib/clients/minds";
import { campaignExportClient } from "@/lib/clients/campaign-export";
import type { CampaignResult, ScrapeResult } from "@/lib/schemas/campaign";

export interface OrchestratorInput {
  url: string;
  niche: string;
}

/**
 * Main orchestration pipeline — coordinates all agents:
 * 1. Scrape (Apify: TikTok, Instagram, Shopify in parallel)
 * 2. Brand Twin Review (Minds AI)
 * 3. Generate Pixero-ready ads/captions
 * 4. Campaign Export
 * 5. Compile action items
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

  /* ── Step 3: Pixero-ready ads + captions ─────────────────── */
  const campaignExport = campaignExportClient.generateCampaignExport({
    url,
    niche,
    trends: scrape,
    brandReview: brandTwin,
  });

  /* ── Step 4: Campaign Export ─────────────────────────────── */
  // Keep `ads` as a legacy alias until API consumers migrate to `campaignExport`.
  const ads = campaignExport;

  /* ── Step 5: Compile action items ────────────────────────── */
  const actionItems = compileActionItems(scrape, brandTwin, campaignExport);

  return {
    scrape,
    brandTwin,
    ads,
    campaignExport,
    actionItems,
    timestamp: new Date().toISOString(),
  };
}

function compileActionItems(
  scrape: ScrapeResult,
  brandTwin: CampaignResult["brandTwin"],
  campaignExport: CampaignResult["campaignExport"],
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

  // From campaign export
  if (campaignExport?.instagramPosts?.length) {
    items.push(
      `🎨 ${campaignExport.instagramPosts.length} Instagram caption variants ready — test awareness, social proof, urgency, and UGC hooks`,
    );
  }
  if (campaignExport?.campaignBrief?.summary) {
    items.push(`📝 ${campaignExport.campaignBrief.summary}`);
  }
  items.push("📱 Download campaign brief → drag into Pixero for Meta ads");
  items.push("📸 Copy Instagram captions → paste into Instagram posts");

  // Always include
  items.push("📊 Set up conversion tracking (Meta Pixel + CAPI) before launch");
  items.push("🔄 Review campaign performance after 7 days and iterate");

  return items;
}
