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
 * Falls back to empty array on error.
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

/* ── TikTok trending ─────────────────────────────────────── */
async function scrapeTikTok(niche: string): Promise<{
  status: "success" | "error";
  trends?: TikTokTrend[];
  error?: string;
}> {
  if (!APIFY_TOKEN) {
    return {
      status: "error",
      error: "APIFY_API_TOKEN not set — TikTok scrape skipped",
    };
  }

  try {
    const raw = await runActor<Record<string, unknown>>(
      "clockworks~tiktok-scraper",
      {
        hashtags: [niche],
        resultsPerPage: 15,
        shouldDownloadVideos: false,
      },
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
    return {
      status: "error",
      error: err instanceof Error ? err.message : "TikTok scrape failed",
    };
  }
}

/* ── Instagram competitor posts ───────────────────────────── */
async function scrapeInstagram(niche: string): Promise<{
  status: "success" | "error";
  posts?: InstagramPost[];
  error?: string;
}> {
  if (!APIFY_TOKEN) {
    return {
      status: "error",
      error: "APIFY_API_TOKEN not set — Instagram scrape skipped",
    };
  }

  try {
    const raw = await runActor<Record<string, unknown>>(
      "apify~instagram-scraper",
      {
        search: niche,
        searchType: "hashtag",
        resultsLimit: 15,
      },
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
      hashtags: Array.isArray(item.hashtags)
        ? (item.hashtags as string[])
        : [],
    }));

    return { status: "success", posts };
  } catch (err: unknown) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Instagram scrape failed",
    };
  }
}

type EcommerceStartUrl = string | { url: string; [key: string]: unknown };

function extractPrimaryUrl(
  startUrls: EcommerceStartUrl[],
): string {
  const firstStringUrl = startUrls.find((url) => typeof url === "string");
  if (firstStringUrl) {
    return firstStringUrl;
  }

  const firstObjectUrl = startUrls.find(
    (url) => typeof url === "object" && typeof url.url === "string",
  ) as { url?: string } | undefined;

  return firstObjectUrl?.url ?? "";
}

/* ── E-commerce product scrape ───────────────────────────── */
async function scrapeEcommerce(
  startUrlsInput: string | EcommerceStartUrl | EcommerceStartUrl[],
): Promise<{
  status: "success" | "error";
  products?: ShopifyProduct[];
  storeName?: string;
  error?: string;
}> {
  if (!APIFY_TOKEN) {
    return {
      status: "error",
      error: "APIFY_API_TOKEN not set — E-commerce scrape skipped",
    };
  }

  try {
    const startUrls = Array.isArray(startUrlsInput)
      ? startUrlsInput
      : [startUrlsInput];
    const primaryUrl = extractPrimaryUrl(startUrls);

    const raw = await runActor<Record<string, unknown>>(
      "apify~e-commerce-scraping-tool",
      {
        startUrls,
        maxItems: 20,
      },
      90,
    );

    const products: ShopifyProduct[] = raw.map((item) => ({
      title: String(item.title ?? ""),
      description: String(item.description ?? item.body_html ?? ""),
      vendor: String(item.vendor ?? ""),
      productType: String(item.productType ?? item.product_type ?? ""),
      price: String(
        (item.variants as Array<Record<string, unknown>> | undefined)?.[0]?.price ??
          item.price ??
          "",
      ),
      compareAtPrice: String(
        (item.variants as Array<Record<string, unknown>> | undefined)?.[0]
          ?.compare_at_price ?? "",
      ),
      images: Array.isArray(item.images)
        ? (item.images as Array<Record<string, unknown>>).map(
            (img) => String(img.src ?? img),
          )
        : [],
      url: String(item.url ?? ""),
    }));

    let derivedStoreName = "";
    if (primaryUrl) {
      try {
        derivedStoreName = new URL(primaryUrl)
          .hostname
          .replace(".myshopify.com", "");
      } catch {
        derivedStoreName = primaryUrl;
      }
    }

    const storeName = products[0]?.vendor || derivedStoreName;

    return { status: "success", products, storeName };
  } catch (err: unknown) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "E-commerce scrape failed",
    };
  }
}

/* ── Public API ──────────────────────────────────────────── */
export const apifyClient = {
  scrapeTikTok,
  scrapeInstagram,
  scrapeEcommerce,

  /** Legacy compat — run all three scrapers in parallel */
  async scrapeAll(url: string, niche: string): Promise<ScrapeResult> {
    const [tiktok, instagram, ecommerce] = await Promise.all([
      scrapeTikTok(niche),
      scrapeInstagram(niche),
      scrapeEcommerce(url),
    ]);
    return { tiktok, instagram, shopify: ecommerce };
  },

  /** Kept for backward compat with the old run route */
  async getTrends({ url, niche }: { url: string; niche: string }) {
    return this.scrapeAll(url, niche);
  },
};
