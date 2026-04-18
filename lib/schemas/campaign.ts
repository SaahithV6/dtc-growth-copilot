import { z } from "zod";

/* ── Apify: TikTok trends ───────────────────────────────── */
export const tiktokTrendSchema = z.object({
  id: z.string(),
  text: z.string(),
  authorMeta: z.object({
    name: z.string(),
    fans: z.number().optional(),
  }).optional(),
  hashtags: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  diggCount: z.number().optional(),
  shareCount: z.number().optional(),
  playCount: z.number().optional(),
  commentCount: z.number().optional(),
});

export type TikTokTrend = z.infer<typeof tiktokTrendSchema>;

/* ── Apify: Instagram posts ──────────────────────────────── */
export const instagramPostSchema = z.object({
  id: z.string().optional(),
  shortCode: z.string().optional(),
  caption: z.string().optional(),
  likesCount: z.number().optional(),
  commentsCount: z.number().optional(),
  url: z.string().optional(),
  ownerUsername: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

export type InstagramPost = z.infer<typeof instagramPostSchema>;

/* ── Apify: Shopify products ─────────────────────────────── */
export const shopifyProductSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  price: z.string().optional(),
  compareAtPrice: z.string().optional(),
  images: z.array(z.string()).optional(),
  url: z.string().optional(),
});

export type ShopifyProduct = z.infer<typeof shopifyProductSchema>;

/* ── Scrape aggregated result ─────────────────────────────── */
export const scrapeResultSchema = z.object({
  tiktok: z.object({
    status: z.enum(["success", "error"]),
    trends: z.array(tiktokTrendSchema).optional(),
    error: z.string().optional(),
  }),
  instagram: z.object({
    status: z.enum(["success", "error"]),
    posts: z.array(instagramPostSchema).optional(),
    error: z.string().optional(),
  }),
  shopify: z.object({
    status: z.enum(["success", "error"]),
    products: z.array(shopifyProductSchema).optional(),
    storeName: z.string().optional(),
    error: z.string().optional(),
  }),
});

export type ScrapeResult = z.infer<typeof scrapeResultSchema>;

/* ── Minds AI brand twin ──────────────────────────────────── */
export const brandTwinFeedbackSchema = z.object({
  status: z.enum(["success", "error"]),
  personaName: z.string().optional(),
  overallScore: z.number().min(0).max(10).optional(),
  feedback: z.object({
    brandPerception: z.string().optional(),
    adCopyReview: z.string().optional(),
    improvements: z.array(z.string()).optional(),
    targetAudienceFit: z.string().optional(),
    emotionalResponse: z.string().optional(),
  }).optional(),
  conversation: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string(),
  })).optional(),
  error: z.string().optional(),
});

export type BrandTwinFeedback = z.infer<typeof brandTwinFeedbackSchema>;

/* ── Pixero ad creatives ──────────────────────────────────── */
export const adCreativeSchema = z.object({
  format: z.string(),
  concept: z.string(),
  headline: z.string().optional(),
  primaryText: z.string().optional(),
  callToAction: z.string().optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
});

export type AdCreative = z.infer<typeof adCreativeSchema>;

export const pixeroResultSchema = z.object({
  status: z.enum(["success", "error"]),
  campaignName: z.string().optional(),
  strategy: z.string().optional(),
  hooks: z.array(z.string()).optional(),
  creatives: z.array(adCreativeSchema).optional(),
  budget: z.object({
    daily: z.string().optional(),
    total: z.string().optional(),
    duration: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
});

export type PixeroResult = z.infer<typeof pixeroResultSchema>;

/* ── Full campaign result ─────────────────────────────────── */
export const campaignResultSchema = z.object({
  scrape: scrapeResultSchema.optional(),
  brandTwin: brandTwinFeedbackSchema.optional(),
  ads: pixeroResultSchema.optional(),
  actionItems: z.array(z.string()).optional(),
  timestamp: z.string(),
});

export type CampaignResult = z.infer<typeof campaignResultSchema>;
