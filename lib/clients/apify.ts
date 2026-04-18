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

type StartUrlObject = {
  url: string;
  [key: string]: unknown;
};

type StartUrlsInput = string | StartUrlObject | Array<string | StartUrlObject>;

function normalizeUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function normalizeStartUrls(input: StartUrlsInput): StartUrlObject[] {
  const values = Array.isArray(input) ? input : [input];
  return values.flatMap((value) => {
    if (typeof value === "string") {
      const normalized = normalizeUrl(value);
      return normalized ? [{ url: normalized }] : [];
    }
    if (value && typeof value.url === "string") {
      const normalized = normalizeUrl(value.url);
      return normalized ? [{ ...value, url: normalized }] : [];
    }
    return [];
  });
}

/* -- E-commerce products -- */
async function scrapeEcommerce(startUrlsInput: StartUrlsInput): Promise<{
  status: "success" | "error";
  products?: ShopifyProduct[];
  storeName?: string;
  error?: string;
}> {
  if (!APIFY_TOKEN) {
    return { status: "error", error: "APIFY_API_TOKEN not set" };
  }

  try {
    const startUrls = normalizeStartUrls(startUrlsInput);
    if (!startUrls.length) {
      return { status: "error", error: "Invalid store URL" };
    }

    const raw = await runActor<Record<string, unknown>>(
      "apify~e-commerce-scraping-tool",
      {
        startUrls,
        maxItems: 50,
      },
      90,
    );

    const baseUrl = startUrls[0]?.url ?? "";
    const products: ShopifyProduct[] = raw.map((item) => {
      const imageCandidates = item.images ?? item.imageUrls ?? item.image;
      return {
        title: String(item.title ?? item.name ?? ""),
        description: String(
          item.description ?? item.body_html ?? item.shortDescription ?? "",
        ),
        vendor: String(item.vendor ?? item.brand ?? ""),
        productType: String(item.productType ?? item.category ?? ""),
        price: String(item.price ?? item.currentPrice ?? item.salePrice ?? ""),
        compareAtPrice: String(
          item.compareAtPrice ?? item.originalPrice ?? item.oldPrice ?? "",
        ),
        images: Array.isArray(imageCandidates)
          ? imageCandidates.map(String)
          : imageCandidates
            ? [String(imageCandidates)]
            : [],
        url: String(item.url ?? item.productUrl ?? ""),
      };
    }).filter((product) => product.title.trim());

    let storeName = "";
    try {
      const hostname = new URL(baseUrl).hostname.replace(/^www\./, "");
      storeName =
        products[0]?.vendor ||
        (hostname.endsWith(".myshopify.com")
          ? hostname.replace(".myshopify.com", "")
          : hostname);
    } catch {
      storeName = products[0]?.vendor || "";
    }

    return { status: "success", products, storeName };
  } catch (err: unknown) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "E-commerce scrape failed",
    };
  }
}

/* -- Public API -- */
export const apifyClient = {
  scrapeTikTok,
  scrapeInstagram,
  scrapeEcommerce,
  /** @deprecated Use scrapeEcommerce. */
  scrapeShopify: scrapeEcommerce,

  async scrapeAll(url: string, niche: string): Promise<ScrapeResult> {
    const [tiktok, instagram, shopify] = await Promise.all([
      scrapeTikTok(niche),
      scrapeInstagram(niche),
      scrapeEcommerce(url),
    ]);
    return { tiktok, instagram, shopify };
  },

  async getTrends({ url, niche }: { url: string; niche: string }) {
    return this.scrapeAll(url, niche);
  },
};
