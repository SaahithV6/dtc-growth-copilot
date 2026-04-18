"use client";

import type { CampaignResult } from "@/lib/schemas/campaign";

interface ResultsProps {
  data: CampaignResult;
}

export default function Results({ data }: ResultsProps) {
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

      {/* Ad Creatives & Campaign */}
      <Section title="🎨 Ad Creatives & Campaign">
        <Card title={data.ads?.campaignName ?? "Campaign"} status={data.ads?.status}>
          {data.ads?.strategy && (
            <p className="mb-4 text-sm text-zinc-300">{data.ads.strategy}</p>
          )}
          {data.ads?.hooks?.length ? (
            <div className="mb-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Hooks
              </p>
              <div className="flex flex-wrap gap-2">
                {data.ads.hooks.map((h, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {data.ads?.creatives?.map((c, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs uppercase text-zinc-300">
                    {c.format}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-200">
                  {c.headline || c.concept}
                </p>
                {c.primaryText && (
                  <p className="mt-1 text-xs text-zinc-400">{c.primaryText}</p>
                )}
                {c.callToAction && (
                  <span className="mt-2 inline-block rounded bg-white px-2 py-0.5 text-xs font-medium text-black">
                    {c.callToAction}
                  </span>
                )}
              </div>
            ))}
          </div>
          {data.ads?.budget && (
            <div className="mt-4 rounded-lg bg-zinc-900/50 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Budget Recommendation
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                {data.ads.budget.daily} daily · {data.ads.budget.total} total ·{" "}
                {data.ads.budget.duration}
              </p>
            </div>
          )}
        </Card>
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
