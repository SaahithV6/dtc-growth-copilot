import axios from "axios";
import type {
  PixeroResult,
  ScrapeResult,
  BrandTwinFeedback,
} from "@/lib/schemas/campaign";

const PIXERO_API_KEY = process.env.PIXERO_API_KEY ?? "";
const PIXERO_BASE = "https://api.pixero.ai/v1";

export const pixeroClient = {
  async generateAds({
    url,
    niche,
    trends,
    brandReview,
  }: {
    url: string;
    niche: string;
    trends: ScrapeResult | unknown;
    brandReview: BrandTwinFeedback | unknown;
  }): Promise<PixeroResult> {
    if (!PIXERO_API_KEY) {
      return this.generateFallbackAds(url, niche, trends as ScrapeResult, brandReview as BrandTwinFeedback);
    }

    try {
      const scrape = trends as ScrapeResult;
      const review = brandReview as BrandTwinFeedback;

      const res = await axios.post(
        `${PIXERO_BASE}/campaigns/generate`,
        {
          brand_url: url,
          niche,
          products: scrape?.shopify?.products?.slice(0, 5).map((p) => ({
            name: p.title,
            price: p.price,
            image: p.images?.[0],
          })),
          target_audience: review?.feedback?.targetAudienceFit ?? `${niche} consumers aged 18-34`,
          hooks: review?.feedback?.improvements?.slice(0, 3) ?? [],
          platform: "meta",
        },
        {
          headers: {
            Authorization: `Bearer ${PIXERO_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 60_000,
        },
      );

      const data = res.data;
      return {
        status: "success",
        campaignName: String(data.campaignName ?? data.campaign_name ?? `${niche} Launch Blitz`),
        strategy: String(data.strategy ?? ""),
        hooks: Array.isArray(data.hooks) ? data.hooks.map(String) : [],
        creatives: Array.isArray(data.creatives)
          ? data.creatives.map((c: Record<string, unknown>) => ({
              format: String(c.format ?? "static"),
              concept: String(c.concept ?? ""),
              headline: String(c.headline ?? ""),
              primaryText: String(c.primary_text ?? c.primaryText ?? ""),
              callToAction: String(c.cta ?? c.callToAction ?? "Shop Now"),
              imageUrl: String(c.image_url ?? c.imageUrl ?? ""),
              videoUrl: String(c.video_url ?? c.videoUrl ?? ""),
            }))
          : [],
        budget: {
          daily: String(data.budget?.daily ?? ""),
          total: String(data.budget?.total ?? ""),
          duration: String(data.budget?.duration ?? ""),
        },
      };
    } catch {
      return this.generateFallbackAds(url, niche, trends as ScrapeResult, brandReview as BrandTwinFeedback);
    }
  },

  /** Fallback when PIXERO_API_KEY is not set or API fails */
  generateFallbackAds(
    url: string,
    niche: string,
    scrape: ScrapeResult,
    review: BrandTwinFeedback,
  ): PixeroResult {
    const products = scrape?.shopify?.products ?? [];
    const improvements = review?.feedback?.improvements ?? [];
    const topProduct = products[0];

    return {
      status: "success",
      campaignName: `${niche.charAt(0).toUpperCase() + niche.slice(1)} Launch Blitz`,
      strategy: `Multi-phase Meta campaign targeting ${niche} enthusiasts aged 18-34. Phase 1: UGC-style awareness ads. Phase 2: Social proof + testimonial retargeting. Phase 3: Urgency/scarcity conversion.`,
      hooks: [
        "Before/after transformation hook",
        "Problem → solution hook",
        "Creator unboxing / first reaction hook",
        "\"I tried this for 30 days\" hook",
        ...(improvements.length ? [`Improvement-based: ${improvements[0]}`] : []),
      ],
      creatives: [
        {
          format: "video",
          concept: "Creator unboxing — authentic first reaction to hero product",
          headline: topProduct ? `Discover ${topProduct.title}` : `Discover ${niche} essentials`,
          primaryText: `The ${niche} community is obsessing over this. See why 10,000+ customers switched.`,
          callToAction: "Shop Now",
        },
        {
          format: "static",
          concept: "Split-screen benefit comparison — your brand vs. generic",
          headline: "Why settle for less?",
          primaryText: `Premium ${niche} products at prices that make sense. Join the movement.`,
          callToAction: "Learn More",
        },
        {
          format: "carousel",
          concept: "Product showcase — top 3 products with social proof",
          headline: "Customer favorites",
          primaryText: `Our top-rated ${niche} picks, loved by thousands. Swipe to explore →`,
          callToAction: "Shop Now",
        },
        {
          format: "video",
          concept: "30-day transformation story — real customer results",
          headline: "30 days changed everything",
          primaryText: `Real results from real ${niche} enthusiasts. Your turn?`,
          callToAction: "Get Started",
        },
      ],
      budget: {
        daily: "$20–$50",
        total: "$600–$1500 for 30-day test",
        duration: "30 days (3 phases × 10 days)",
      },
    };
  },
};

