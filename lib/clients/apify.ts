import axios from "axios";
import type {
  TikTokTrend,
  InstagramPost,
  ShopifyProduct,
  ScrapeResult,
} from "@/lib/schemas/campaign";

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN ?? "";

/**
 * Run an Apify actor and return the dataset items.
 */
async function runActor<T>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 120,
): Promise<T[]> {
  const res = await axios.post(
    `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items`,
    input,
    {
      params: { token: APIFY_TOKEN, timeout: timeoutSecs },
      headers: { "Content-Type": "application/json" },
      timeout: (timeoutSecs + 30) * 1000,
    },
  );
  return res.data as T[];
}

/* -- TikTok trending -- */
async function scrapeTikTok(niche: string): Promise<{
  status: "success" | "error";
  trends?: TikTokTrend[];
  error?: string;
}> {
  if (!APIFY_TOKEN) {
    return { status: "error", error: "APIFY_API_TOKEN not set" };
  }
  try {
    const raw = await runActor<Record<string, unknown>>(
      "clockworks~tiktok-scraper",
      { hashtags: [niche], resultsPerPage: 15, shouldDownloadVideos: false },
      90,
    );
    const trends: TikTokTrend[] = raw.map((item) => ({
      id: String(item.id ?? ""),
      text: String(item.text ?? ""),
      authorMeta: item.authorMeta
        ? {
            name: String((item.authorMeta as Record<string, unknown>).name ?? ""),
            fans: Number((item.authorMeta as Record<string, unknown>).fans ?? 0),
          }
        : undefined,
      hashtags: Array.isArray(item.hashtags)
        ? (item.hashtags as Array<Record<string, unknown>>).map((h) => String(h.name ?? h))
        : [],
      videoUrl: String(item.videoUrl ?? item.webVideoUrl ?? ""),
      diggCount: Number(item.diggCount ?? 0),
      shareCount: Number(item.shareCount ?? 0),
      playCount: Number(item.playCount ?? 0),
      commentCount: Number(item.commentCount ?? 0),
    }));
    return { status: "success", trends };
  } catch (err: unknown) {
    return { status: "error", error: err instanceof Error ? err.message : "TikTok scrape failed" };
  }
}

/* -- Instagram competitor posts -- */
async function scrapeInstagram(niche: string): Promise<{
  status: "success" | "error";
  posts?: InstagramPost[];
  error?: string;
}> {
  if (!APIFY_TOKEN) {
    return { status: "error", error: "APIFY_API_TOKEN not set" };
  }
  try {
    const raw = await runActor<Record<string, unknown>>(
      "apify~instagram-scraper",
      { search: niche, searchType: "hashtag", resultsLimit: 15 },
      90,
    );
    const posts: InstagramPost[] = raw.map((item) => ({
      id: String(item.id ?? ""),
      shortCode: String(item.shortCode ?? ""),
      caption: String(item.caption ?? ""),
      likesCount: Number(item.likesCount ?? 0),
      commentsCount: Number(item.commentsCount ?? 0),
      url: String(item.url ?? ""),
      ownerUsername: String(item.ownerUsername ?? ""),
      hashtags: Array.isArray(item.hashtags) ? (item.hashtags as string[]) : [],
    }));
    return { status: "success", posts };
  } catch (err: unknown) {
    return { status: "error", error: err instanceof Error ? err.message : "Instagram scrape failed" };
  }
}

/* -- Shopify products via free /products.json endpoint (no API key needed) -- */
async function scrapeShopify(storeUrl: string): Promise<{
  status: "success" | "error";
  products?: ShopifyProduct[];
  storeName?: string;
  error?: string;
}> {
  try {
    let baseUrl = storeUrl.replace(/\/+$/, "");
    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }
    const productsUrl = `${baseUrl}/products.json?limit=50`;

    const res = await axios.get(productsUrl, { timeout: 30_000 });
    const rawProducts = res.data?.products ?? [];

    const products: ShopifyProduct[] = rawProducts.map(
      (item: Record<string, unknown>) => ({
        title: String(item.title ?? ""),
        description: String(item.body_html ?? item.description ?? ""),
        vendor: String(item.vendor ?? ""),
        productType: String(item.product_type ?? ""),
        price: String(
          (item.variants as Array<Record<string, unknown>> | undefined)?.[0]?.price ?? "",
        ),
        compareAtPrice: String(
          (item.variants as Array<Record<string, unknown>> | undefined)?.[0]?.compare_at_price ?? "",
        ),
        images: Array.isArray(item.images)
          ? (item.images as Array<Record<string, unknown>>).map((img) => String(img.src ?? img))
          : [],
        url: `${baseUrl}/products/${String(item.handle ?? "")}`,
      }),
    );

    let storeName = "";
    try {
      const hostname = new URL(baseUrl).hostname.replace(/^www\./, "");
      storeName = products[0]?.vendor || (hostname.endsWith(".myshopify.com") ? hostname.replace(".myshopify.com", "") : hostname);
    } catch {
      storeName = products[0]?.vendor || "";
    }

    return { status: "success", products, storeName };
  } catch (err: unknown) {
    return { status: "error", error: err instanceof Error ? err.message : "Shopify products.json fetch failed" };
  }
}

/* -- Public API -- */
export const apifyClient = {
  scrapeTikTok,
  scrapeInstagram,
  scrapeShopify,

  async scrapeAll(url: string, niche: string): Promise<ScrapeResult> {
    const [tiktok, instagram, shopify] = await Promise.all([
      scrapeTikTok(niche),
      scrapeInstagram(niche),
      scrapeShopify(url),
    ]);
    return { tiktok, instagram, shopify };
  },

  async getTrends({ url, niche }: { url: string; niche: string }) {
    return this.scrapeAll(url, niche);
  },
};
