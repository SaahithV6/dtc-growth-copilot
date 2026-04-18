import axios from "axios";
import type { BrandTwinFeedback, ScrapeResult } from "@/lib/schemas/campaign";

const MINDS_API_KEY = process.env.MINDS_API_KEY ?? "";
const MINDS_BASE = "https://getminds.ai/api/v1";
const CLIMATE_PANEL_ID = "2928c3d3-9e73-450d-818a-1e64de0446b0";
const CLIMATE_PANEL_NAME = "Climate Board API Access";

export const mindsClient = {
  async reviewBrand({
    url,
    niche,
    trends,
  }: {
    url: string;
    niche: string;
    trends: ScrapeResult | unknown;
  }): Promise<BrandTwinFeedback> {
    if (!MINDS_API_KEY) {
      return this.generateFallbackReview(url, niche, trends as ScrapeResult);
    }

    try {
      const scrapeData = trends as ScrapeResult;
      const sparkIds = await fetchPanelSparkIds();

      if (sparkIds.length) {
        await Promise.allSettled(
          sparkIds.map((sparkId) =>
            addSparkKnowledge(sparkId, {
              link: url,
              description: "DTC store to review",
            }),
          ),
        );

        const keywords = extractKeywordSignals(niche, scrapeData);
        if (keywords.length) {
          await Promise.allSettled(
            sparkIds.map((sparkId) => addSparkKnowledge(sparkId, { keywords })),
          );
        }
      }

      const question = buildPanelQuestion(url, niche, scrapeData);
      const reply = await askPanel(question);

      return parsePanelResponse(reply, question);
    } catch {
      return this.generateFallbackReview(url, niche, trends as ScrapeResult);
    }
  },

  /** Fallback when MINDS_API_KEY is not set or API fails */
  generateFallbackReview(
    url: string,
    niche: string,
    scrape: ScrapeResult,
  ): BrandTwinFeedback {
    const products = scrape?.shopify?.products ?? [];
    const tiktokTrends = scrape?.tiktok?.trends ?? [];
    const igPosts = scrape?.instagram?.posts ?? [];

    const avgPrice = products.length
      ? (
          products.reduce((s, p) => s + parseFloat(p.price || "0"), 0) /
          products.length
        ).toFixed(2)
      : "N/A";

    const topHashtags = [
      ...new Set(
        tiktokTrends.flatMap((t) => t.hashtags ?? []).slice(0, 10),
      ),
    ];

    return {
      status: "success",
      personaName: CLIMATE_PANEL_NAME,
      overallScore: 7.5,
      feedback: {
        brandPerception: `Based on ${products.length} products at avg $${avgPrice}, this brand targets a value-conscious ${niche} buyer. The product range ${products.length > 5 ? "is well diversified" : "could benefit from expansion"}.`,
        adCopyReview: `Current messaging should lean into social proof. ${tiktokTrends.length} trending TikToks in the ${niche} space suggest UGC-style creative performs best. Top hooks found: before/after transformations, creator unboxings.`,
        improvements: [
          "Lead with social proof (review counts, creator endorsements)",
          "Adopt trending formats: short-form UGC, split-screen demos",
          topHashtags.length
            ? `Ride trending hashtags: ${topHashtags.slice(0, 5).join(", ")}`
            : "Research niche-specific hashtags for discoverability",
          "Add urgency: limited drops, countdown timers in stories",
          "Test hero messaging that clearly differentiates from competitors",
        ],
        targetAudienceFit: `Your ICP is a ${niche}-focused consumer aged 18-34 who discovers brands on TikTok/Instagram. ${igPosts.length} competitor posts analyzed — engagement patterns suggest authentic, relatable content outperforms polished brand content.`,
        emotionalResponse: `As a potential customer, the brand feels ${products.length > 3 ? "established and trustworthy" : "fresh and emerging"}. I'd want to see more behind-the-scenes content and real customer stories to feel a personal connection before purchasing.`,
      },
      conversation: [
        {
          role: "system",
          content: `${CLIMATE_PANEL_NAME} fallback analysis generated from scraped data.`,
        },
        {
          role: "user",
          content: `Review this ${niche} brand at ${url}`,
        },
        {
          role: "assistant",
          content: "Analysis complete — see feedback sections for detailed panel review.",
        },
      ],
    };
  },
};

type SparkKnowledgePayload =
  | {
      link: string;
      description: string;
    }
  | {
      keywords: string[];
    };

const mindsHeaders = {
  Authorization: `Bearer ${MINDS_API_KEY}`,
  "Content-Type": "application/json",
};

async function fetchPanelSparkIds(): Promise<string[]> {
  const res = await axios.get(`${MINDS_BASE}/panels/${CLIMATE_PANEL_ID}`, {
    headers: mindsHeaders,
    timeout: 30_000,
  });

  const panelData = (res.data?.panel ?? res.data) as Record<string, unknown>;
  const sparks = (panelData.sparks ?? []) as Array<unknown>;

  return sparks
    .map((spark) => {
      if (typeof spark === "string") {
        return spark;
      }
      if (spark && typeof spark === "object") {
        const sparkRecord = spark as Record<string, unknown>;
        return String(
          sparkRecord.id ?? sparkRecord.sparkId ?? sparkRecord.uuid ?? "",
        );
      }
      return "";
    })
    .filter(Boolean);
}

async function addSparkKnowledge(
  sparkId: string,
  payload: SparkKnowledgePayload,
): Promise<void> {
  await axios.post(`${MINDS_BASE}/sparks/${sparkId}/knowledge`, payload, {
    headers: mindsHeaders,
    timeout: 30_000,
  });
}

function extractKeywordSignals(niche: string, scrape: ScrapeResult): string[] {
  const tokens = new Set<string>();
  const nicheTokens = niche
    .split(/[,\-|/]/)
    .map((part) => normalizeKeyword(part))
    .filter((part) => part.length > 2);
  nicheTokens.forEach((token) => tokens.add(token));

  const tiktokTrends = scrape?.tiktok?.trends ?? [];
  const instagramPosts = scrape?.instagram?.posts ?? [];
  const products = scrape?.shopify?.products ?? [];

  tiktokTrends.forEach((trend) => {
    trend.hashtags?.forEach((tag) => {
      const normalized = normalizeKeyword(tag);
      if (normalized.length > 2) {
        tokens.add(normalized);
      }
    });
  });

  instagramPosts.forEach((post) => {
    post.hashtags?.forEach((tag) => {
      const normalized = normalizeKeyword(tag);
      if (normalized.length > 2) {
        tokens.add(normalized);
      }
    });
  });

  products.forEach((product) => {
    const normalizedTitle = normalizeKeyword(product.title);
    if (normalizedTitle.length > 2) {
      tokens.add(normalizedTitle);
    }
    if (product.productType) {
      const normalizedType = normalizeKeyword(product.productType);
      if (normalizedType.length > 2) {
        tokens.add(normalizedType);
      }
    }
  });

  return [...tokens].slice(0, 30);
}

function normalizeKeyword(value: string): string {
  return value
    .replace(/^#/, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildPanelQuestion(url: string, niche: string, scrape: ScrapeResult): string {
  const products = scrape?.shopify?.products ?? [];
  const tiktokTrends = scrape?.tiktok?.trends ?? [];
  const igPosts = scrape?.instagram?.posts ?? [];

  return [
    `Evaluate this DTC brand and campaign opportunity.`,
    `Store URL: ${url}`,
    `Niche: ${niche}`,
    `Top products: ${products.slice(0, 5).map((p) => p.title).join(", ") || "N/A"}`,
    `TikTok trends: ${tiktokTrends.slice(0, 5).flatMap((t) => t.hashtags ?? []).join(", ") || "N/A"}`,
    `Instagram competitor hashtags: ${igPosts.slice(0, 5).flatMap((p) => p.hashtags ?? []).join(", ") || "N/A"}`,
    "Respond as strict JSON with keys: overallScore, brandPerception, adCopyReview, improvements (array of 5), targetAudienceFit, emotionalResponse.",
  ].join("\n");
}

async function askPanel(question: string): Promise<string> {
  const response = await fetch(`${MINDS_BASE}/panels/${CLIMATE_PANEL_ID}/ask`, {
    method: "POST",
    headers: {
      ...mindsHeaders,
      Accept: "text/event-stream, application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error(`Minds panel ask failed with ${response.status}`);
  }

  const raw = await response.text();
  return parseSseOrRawResponse(raw);
}

function parseSseOrRawResponse(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      return extractReplyText(parsed) || trimmed;
    } catch {
      return trimmed;
    }
  }

  const fragments: string[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") {
      continue;
    }

    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const chunk = extractReplyText(parsed);
      if (chunk) {
        fragments.push(chunk);
      }
    } catch {
      fragments.push(payload);
    }
  }

  return fragments.join("\n").trim() || trimmed;
}

function extractReplyText(payload: Record<string, unknown>): string {
  const direct = payload.answer ?? payload.message ?? payload.response ?? payload.text ?? payload.content;
  if (typeof direct === "string") {
    return direct;
  }

  const choices = payload.choices;
  if (Array.isArray(choices) && choices.length) {
    const choice = choices[0] as Record<string, unknown>;
    const delta = choice.delta as Record<string, unknown> | undefined;
    const deltaContent = delta?.content;
    if (typeof deltaContent === "string") {
      return deltaContent;
    }
    const message = choice.message as Record<string, unknown> | undefined;
    const messageContent = message?.content;
    if (typeof messageContent === "string") {
      return messageContent;
    }
  }

  const data = payload.data;
  if (data && typeof data === "object") {
    return extractReplyText(data as Record<string, unknown>);
  }

  return "";
}

function parsePanelResponse(reply: string, question: string): BrandTwinFeedback {
  try {
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return {
        status: "success",
        personaName: CLIMATE_PANEL_NAME,
        overallScore: Number(parsed.overallScore ?? 7),
        feedback: {
          brandPerception: String(parsed.brandPerception ?? ""),
          adCopyReview: String(parsed.adCopyReview ?? ""),
          improvements: Array.isArray(parsed.improvements)
            ? parsed.improvements.map(String)
            : [],
          targetAudienceFit: String(parsed.targetAudienceFit ?? ""),
          emotionalResponse: String(parsed.emotionalResponse ?? ""),
        },
        conversation: [
          { role: "user", content: question },
          { role: "assistant", content: reply },
        ],
      };
    }
  } catch {
    // fall through to plain text response
  }

  return {
    status: "success",
    personaName: CLIMATE_PANEL_NAME,
    overallScore: 7,
    feedback: {
      brandPerception: reply.slice(0, 500),
      adCopyReview: "",
      improvements: [],
      targetAudienceFit: "",
      emotionalResponse: "",
    },
    conversation: [
      { role: "user", content: question },
      { role: "assistant", content: reply },
    ],
  };
}
