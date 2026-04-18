import type {
  BrandTwinFeedback,
  CampaignExport,
  ScrapeResult,
} from "@/lib/schemas/campaign";

const PIXERO_URL = "https://pixero.ai";
const MAX_HASHTAGS = 30;

export const campaignExportClient = {
  generateCampaignExport({
    url,
    niche,
    trends,
    brandReview,
  }: {
    url: string;
    niche: string;
    trends: ScrapeResult | unknown;
    brandReview: BrandTwinFeedback | unknown;
  }): CampaignExport {
    try {
      return this.generateFallbackExport(
        url,
        niche,
        trends as ScrapeResult,
        brandReview as BrandTwinFeedback,
      );
    } catch (error: unknown) {
      return {
        status: "error",
        campaignBrief: {
          html: "",
          summary: "",
          pixeroUrl: PIXERO_URL,
        },
        instagramPosts: [],
        downloadableAssets: [],
        error: error instanceof Error ? error.message : "Campaign export failed",
      };
    }
  },

  generateFallbackExport(
    url: string,
    niche: string,
    scrape: ScrapeResult,
    review: BrandTwinFeedback,
  ): CampaignExport {
    const products = scrape?.shopify?.products ?? [];
    const tiktokTrends = scrape?.tiktok?.trends ?? [];
    const instagramPosts = scrape?.instagram?.posts ?? [];
    const improvements = review?.feedback?.improvements ?? [];
    const targetAudience =
      review?.feedback?.targetAudienceFit ??
      `${niche} consumers aged 18-34 active on TikTok and Instagram`;
    const adCopyReview =
      review?.feedback?.adCopyReview ??
      `Lead with authentic UGC-style messaging to improve trust and conversion in the ${niche} niche.`;
    const strategy =
      improvements[0] ??
      `Launch awareness first, then retarget engaged viewers with social proof and urgency offers.`;
    const hashtags = getTrendingHashtags(scrape, niche);
    const topProducts = products.slice(0, 3);

    const productHighlights = topProducts.length
      ? topProducts
          .map(
            (product) =>
              `<li><strong>${escapeHtml(product.title)}</strong>${product.price ? ` — $${escapeHtml(product.price)}` : ""}</li>`,
          )
          .join("")
      : "<li>No product highlights were available from the scrape.</li>";

    const hashtagsLine = hashtags.length
      ? hashtags.map((tag) => `#${tag}`).join(" ")
      : `#${normalizeTag(niche)} #smallbusiness #shopnow`;

    const summary = `Campaign export ready for ${niche}: ${topProducts.length || 0} product highlights, ${hashtags.length} trend hashtags, and ${improvements.length || 1} strategic recommendations from the Minds Brand Twin panel.`;

    const campaignBriefHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(niche)} Campaign Brief</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; line-height: 1.55; margin: 40px; color: #111827; }
      h1, h2 { margin-bottom: 8px; }
      h1 { font-size: 28px; }
      h2 { margin-top: 24px; font-size: 18px; }
      p, li { font-size: 14px; }
      code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(niche)} Campaign Brief</h1>
    <p><strong>Store URL:</strong> <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
    <p><strong>Pixero Upload:</strong> Copy this brief into Pixero or drag/drop this HTML after opening <code>${PIXERO_URL}</code>.</p>
    <h2>Brand Analysis</h2>
    <p>${escapeHtml(review?.feedback?.brandPerception ?? "Brand analysis generated from scraped store and social trend data.")}</p>
    <h2>Climate Advisory Board Feedback</h2>
    <p>${escapeHtml(adCopyReview)}</p>
    <h2>Ad Copy Suggestions + Hooks</h2>
    <ul>
      <li>Awareness hook: "What most ${escapeHtml(niche)} shoppers miss before buying."</li>
      <li>Social proof hook: "Why creators and customers keep recommending this."</li>
      <li>Urgency hook: "Limited stock, high-demand pick for this week only."</li>
      <li>UGC hook: "I tried this for 7 days — here’s what happened."</li>
    </ul>
    <h2>Target Audience Definition</h2>
    <p>${escapeHtml(targetAudience)}</p>
    <h2>Product Highlights + Pricing</h2>
    <ul>${productHighlights}</ul>
    <h2>Trending Hashtags (TikTok + Instagram)</h2>
    <p>${escapeHtml(hashtagsLine)}</p>
    <h2>Recommended Campaign Strategy</h2>
    <p>${escapeHtml(strategy)}</p>
  </body>
</html>`;

    const variants = [
      {
        hookStyle: "awareness",
        type: "feed" as const,
        dimensions: "1080x1080",
        caption: `Most ${niche} shoppers are missing this simple upgrade. Discover what makes this collection stand out before your next purchase.`,
      },
      {
        hookStyle: "social_proof",
        type: "feed" as const,
        dimensions: "1080x1080",
        caption: `Customers keep coming back for these ${niche} favorites. Real results, real reviews, and products people actually reorder.`,
      },
      {
        hookStyle: "urgency",
        type: "story" as const,
        dimensions: "1080x1920",
        caption: `Heads up: top ${niche} picks are moving fast this week. Grab yours now before they’re gone.`,
      },
      {
        hookStyle: "ugc",
        type: "reel" as const,
        dimensions: "1080x1920",
        caption: `POV: you tried this ${niche} product and immediately got asked where it’s from. This is your sign to test it yourself.`,
      },
    ];

    const callToAction = `Shop now: ${url}`;
    const instagramReadyPosts = variants.map((variant) => ({
      ...variant,
      caption: `${variant.caption}\n\n${callToAction}`,
      hashtags,
      callToAction,
    }));

    const downloadableAssets: CampaignExport["downloadableAssets"] = [
      {
        name: "campaign-brief.html",
        type: "campaign_brief",
        content: campaignBriefHtml,
      },
      {
        name: "ad-copy-suggestions.txt",
        type: "ad_copy",
        content: `${adCopyReview}\n\nTop hooks:\n- Awareness\n- Social proof\n- Urgency\n- UGC`,
      },
      ...instagramReadyPosts.map((post, index) => ({
        name: `instagram-caption-${index + 1}-${post.hookStyle}.txt`,
        type: "instagram_caption" as const,
        content: `${post.caption}\n\n${post.hashtags.map((tag) => `#${tag}`).join(" ")}`,
      })),
    ];

    return {
      status: "success",
      campaignBrief: {
        html: campaignBriefHtml,
        summary,
        pixeroUrl: PIXERO_URL,
      },
      instagramPosts: instagramReadyPosts,
      downloadableAssets,
    };
  },
};

function getTrendingHashtags(scrape: ScrapeResult, niche: string): string[] {
  const fromTikTok = scrape?.tiktok?.trends?.flatMap((trend) => trend.hashtags ?? []) ?? [];
  const fromInstagram = scrape?.instagram?.posts?.flatMap((post) => post.hashtags ?? []) ?? [];
  const combined = [...fromTikTok, ...fromInstagram, niche, "smallbusiness", "shoponline"];
  const deduped = new Set<string>();

  combined.forEach((tag) => {
    const normalized = normalizeTag(tag);
    if (normalized) {
      deduped.add(normalized);
    }
  });

  return [...deduped].slice(0, MAX_HASHTAGS);
}

function normalizeTag(value: string): string {
  return value
    .replace(/^#/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
