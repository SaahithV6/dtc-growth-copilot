"use client";

import type { CampaignResult } from "@/lib/schemas/campaign";

interface ResultsProps {
  data: CampaignResult;
}

export default function Results({ data }: ResultsProps) {
  const campaignExport = data.campaignExport ?? data.ads;
  const instagramPosts = campaignExport?.instagramPosts ?? [];

  function downloadFile(name: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = name;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  function handleDownloadCampaignBrief() {
    if (!campaignExport?.campaignBrief?.html) {
      return;
    }
    downloadFile(
      "campaign-brief.html",
      campaignExport.campaignBrief.html,
      "text/html",
    );
  }

  function handleDownloadAsset(name: string, content: string) {
    const type = name.toLowerCase().endsWith(".html")
      ? "text/html"
      : "text/plain";
    downloadFile(name, content, type);
  }

  async function handleCopyCaption(caption: string, hashtags: string[]) {
    const text = `${caption}\n\n${hashtags.map((tag) => `#${tag}`).join(" ")}`;
    await navigator.clipboard.writeText(text);
  }

  function handleDownloadAllCaptions() {
    if (!instagramPosts.length) {
      return;
    }
    const content = instagramPosts
      .map((post, index) => [
        `Variant ${index + 1} (${post.hookStyle}, ${post.type}, ${post.dimensions})`,
        post.caption,
        post.hashtags.map((tag) => `#${tag}`).join(" "),
      ].join("\n"))
      .join("\n\n--------------------\n\n");
    downloadFile("instagram-captions.txt", content, "text/plain");
  }

  return (
    <div className="space-y-8">
      {/* Trend Analysis */}
      <Section title="📱 Trend Analysis">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* TikTok */}
          <Card title="TikTok Trends" status={data.scrape?.tiktok.status}>
            {data.scrape?.tiktok.status === "error" && (
              <p className="text-sm text-zinc-400">
                {data.scrape.tiktok.error}
              </p>
            )}
            {data.scrape?.tiktok.trends?.slice(0, 5).map((t, i) => (
              <div
                key={t.id || i}
                className="border-b border-zinc-800 py-2 last:border-0"
              >
                <p className="text-sm text-zinc-200">
                  {t.text.slice(0, 120)}
                  {t.text.length > 120 ? "…" : ""}
                </p>
                <div className="mt-1 flex gap-3 text-xs text-zinc-500">
                  {t.playCount ? <span>▶ {fmt(t.playCount)}</span> : null}
                  {t.diggCount ? <span>❤ {fmt(t.diggCount)}</span> : null}
                  {t.shareCount ? <span>↗ {fmt(t.shareCount)}</span> : null}
                </div>
              </div>
            ))}
            {!data.scrape?.tiktok.trends?.length &&
              data.scrape?.tiktok.status === "success" && (
                <p className="text-sm text-zinc-500">
                  No TikTok trends found for this niche.
                </p>
              )}
          </Card>

          {/* Instagram */}
          <Card title="Instagram Insights" status={data.scrape?.instagram.status}>
            {data.scrape?.instagram.status === "error" && (
              <p className="text-sm text-zinc-400">
                {data.scrape.instagram.error}
              </p>
            )}
            {data.scrape?.instagram.posts?.slice(0, 5).map((p, i) => (
              <div
                key={p.id || i}
                className="border-b border-zinc-800 py-2 last:border-0"
              >
                <p className="text-sm text-zinc-200">
                  {p.caption?.slice(0, 120)}
                  {(p.caption?.length ?? 0) > 120 ? "…" : ""}
                </p>
                <div className="mt-1 flex gap-3 text-xs text-zinc-500">
                  {p.ownerUsername && <span>@{p.ownerUsername}</span>}
                  {p.likesCount ? <span>❤ {fmt(p.likesCount)}</span> : null}
                </div>
              </div>
            ))}
          </Card>
        </div>
      </Section>

      {/* Competitor Intel */}
      <Section title="🛍️ Competitor Intel">
        <Card title="Shopify Store Data" status={data.scrape?.shopify.status}>
          {data.scrape?.shopify.status === "error" && (
            <p className="text-sm text-zinc-400">
              {data.scrape.shopify.error}
            </p>
          )}
          {data.scrape?.shopify.storeName && (
            <p className="mb-2 text-sm text-zinc-400">
              Store: <span className="text-zinc-200">{data.scrape.shopify.storeName}</span>
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {data.scrape?.shopify.products?.slice(0, 6).map((p, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
              >
                <p className="text-sm font-medium text-zinc-200">{p.title}</p>
                {p.price && (
                  <p className="mt-1 text-xs text-zinc-400">${p.price}</p>
                )}
                {p.productType && (
                  <span className="mt-1 inline-block rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                    {p.productType}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Brand Twin Feedback */}
      <Section title="🧠 Brand Twin Feedback">
        <Card
          title={
            data.brandTwin?.personaName
              ? `Persona: ${data.brandTwin.personaName}`
              : "Brand Twin Analysis"
          }
          status={data.brandTwin?.status}
        >
          {data.brandTwin?.overallScore != null && (
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-lg font-bold text-white">
                {data.brandTwin.overallScore.toFixed(1)}
              </div>
              <span className="text-sm text-zinc-400">Overall Score / 10</span>
            </div>
          )}
          {data.brandTwin?.feedback && (
            <div className="space-y-4">
              {data.brandTwin.feedback.brandPerception && (
                <FeedbackBlock
                  label="Brand Perception"
                  text={data.brandTwin.feedback.brandPerception}
                />
              )}
              {data.brandTwin.feedback.adCopyReview && (
                <FeedbackBlock
                  label="Ad Copy Review"
                  text={data.brandTwin.feedback.adCopyReview}
                />
              )}
              {data.brandTwin.feedback.targetAudienceFit && (
                <FeedbackBlock
                  label="Target Audience Fit"
                  text={data.brandTwin.feedback.targetAudienceFit}
                />
              )}
              {data.brandTwin.feedback.emotionalResponse && (
                <FeedbackBlock
                  label="Emotional Response"
                  text={data.brandTwin.feedback.emotionalResponse}
                />
              )}
              {data.brandTwin.feedback.improvements?.length ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Improvements
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-zinc-300">
                    {data.brandTwin.feedback.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </Section>

      {/* Campaign Export */}
      <Section title="📝 Campaign Export">
        <Card title="Campaign Brief" status={campaignExport?.status}>
          <div className="mb-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadCampaignBrief}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
              disabled={!campaignExport?.campaignBrief?.html}
            >
              Download Campaign Brief
            </button>
            <a
              href={campaignExport?.campaignBrief?.pixeroUrl || "https://pixero.ai"}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200"
            >
              Open in Pixero
            </a>
          </div>
          {campaignExport?.campaignBrief?.summary ? (
            <p className="text-sm text-zinc-300">
              {campaignExport.campaignBrief.summary}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">
              Campaign summary unavailable.
            </p>
          )}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Downloadable Assets
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(campaignExport?.downloadableAssets ?? []).map((asset) => (
                <button
                  key={`${asset.type}-${asset.name}`}
                  type="button"
                  onClick={() => handleDownloadAsset(asset.name, asset.content)}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-left text-xs font-semibold text-zinc-200"
                >
                  {asset.name}
                  <span className="ml-2 text-zinc-500">({asset.type})</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Open Pixero, then drag/drop this campaign brief or paste your store URL.
          </p>
        </Card>
      </Section>

      {/* Instagram Posts */}
      <Section title="📸 Instagram-Ready Posts">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleDownloadAllCaptions}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-50"
            disabled={!instagramPosts.length}
          >
            Download All Captions
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {instagramPosts.map((post, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs uppercase text-zinc-300">
                  {post.hookStyle.replaceAll("_", " ")}
                </span>
                <span className="text-xs text-zinc-500">{post.dimensions}</span>
              </div>
              <p className="text-sm text-zinc-200 whitespace-pre-line">{post.caption}</p>
              <p className="mt-2 text-xs text-zinc-400">
                {post.hashtags.map((tag) => `#${tag}`).join(" ")}
              </p>
              <p className="mt-2 text-xs text-zinc-500 uppercase">{post.type}</p>
              <button
                type="button"
                onClick={() => handleCopyCaption(post.caption, post.hashtags)}
                className="mt-3 rounded bg-white px-3 py-1 text-xs font-semibold text-black"
              >
                Copy to Clipboard
              </button>
            </div>
          ))}
        </div>
        {!instagramPosts.length && (
          <p className="text-sm text-zinc-500">No Instagram post variants available.</p>
        )}
      </Section>

      {/* Action Items */}
      {data.actionItems?.length ? (
        <Section title="✅ Action Items & Next Steps">
          <div className="space-y-2">
            {data.actionItems.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
              >
                <span className="mt-0.5 text-sm text-zinc-500">
                  {i + 1}.
                </span>
                <p className="text-sm text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-zinc-100">{title}</h2>
      {children}
    </section>
  );
}

function Card({
  title,
  status,
  children,
}: {
  title: string;
  status?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {status && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              status === "success"
                ? "bg-green-900/40 text-green-400"
                : "bg-yellow-900/40 text-yellow-400"
            }`}
          >
            {status}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function FeedbackBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="text-sm text-zinc-300">{text}</p>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
