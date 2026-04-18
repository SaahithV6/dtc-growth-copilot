"use client";

import { useEffect, useMemo, useState } from "react";
import type { CampaignResult } from "@/lib/schemas/campaign";

interface ResultsProps {
  data: CampaignResult;
}

interface UploadedAsset {
  id: string;
  name: string;
  url: string;
  contentType: string;
  kind: "image" | "video";
}

interface PostState {
  loading: boolean;
  success?: boolean;
  permalink?: string;
  error?: string;
}

const SUPPORTED_FILE_TYPES = "image/jpeg,image/png,image/webp,video/mp4";
const BATCH_DELAY_MS = 30_000;

export default function Results({ data }: ResultsProps) {
  const instagramPosts = data.ads?.instagramPosts ?? [];
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [captionSelection, setCaptionSelection] = useState<Record<string, number>>(
    {},
  );
  const [postStates, setPostStates] = useState<Record<string, PostState>>({});
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [postingEnabled, setPostingEnabled] = useState(false);
  const [postingHint, setPostingHint] = useState(
    "Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in your environment to enable auto-posting",
  );
  const [batchPosting, setBatchPosting] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInstagramAccount() {
      try {
        const res = await fetch("/api/instagram", { method: "GET" });
        const json = await res.json();
        if (cancelled) return;

        if (json.postingEnabled) {
          setPostingEnabled(true);
          const username = json.account?.username ? `@${json.account.username}` : "@wazzat7";
          setPostingHint(`Connected account: ${username}`);
          return;
        }

        setPostingEnabled(false);
        setPostingHint(
          json.message ??
            "Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in your environment to enable auto-posting",
        );
      } catch {
        if (!cancelled) {
          setPostingEnabled(false);
        }
      }
    }

    void loadInstagramAccount();
    return () => {
      cancelled = true;
    };
  }, []);

  const pairedAssets = useMemo(
    () =>
      uploadedAssets.map((asset, index) => {
        const fallbackIndex = instagramPosts.length ? index % instagramPosts.length : 0;
        const selectedIndex = captionSelection[asset.id] ?? fallbackIndex;
        return {
          asset,
          selectedIndex,
          post: instagramPosts[selectedIndex],
        };
      }),
    [uploadedAssets, instagramPosts, captionSelection],
  );

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
    if (!data.ads?.campaignBrief?.html) {
      return;
    }
    downloadFile("campaign-brief.html", data.ads.campaignBrief.html, "text/html");
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

  function inferKindFromUrl(url: string): "image" | "video" {
    const lower = url.toLowerCase();
    return lower.endsWith(".mp4") ? "video" : "image";
  }

  function createAssetFromUrl(url: string): UploadedAsset {
    const kind = inferKindFromUrl(url);
    return {
      id: crypto.randomUUID(),
      name: url.split("/").pop() || (kind === "video" ? "uploaded-video.mp4" : "uploaded-image"),
      url,
      kind,
      contentType: kind === "video" ? "video/mp4" : "image/*",
    };
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!files.length) {
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const uploaded: UploadedAsset[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Upload failed");
        }

        uploaded.push({
          id: String(json.id),
          name: String(json.name ?? file.name),
          url: String(json.url),
          contentType: String(json.contentType ?? file.type),
          kind: String(json.contentType ?? file.type).startsWith("video/")
            ? "video"
            : "image",
        });
      }

      setUploadedAssets((prev) => [...prev, ...uploaded]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleUrlAdd() {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (!/^https?:$/.test(parsed.protocol)) {
        setUploadError("Only http(s) URLs are supported.");
        return;
      }
      setUploadError("");
      setUploadedAssets((prev) => [...prev, createAssetFromUrl(trimmed)]);
      setUrlInput("");
    } catch {
      setUploadError("Enter a valid image/video URL.");
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    void uploadFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  async function postAsset(asset: UploadedAsset, captionIndex: number) {
    const post = instagramPosts[captionIndex];
    if (!post) {
      setPostStates((prev) => ({
        ...prev,
        [asset.id]: { loading: false, success: false, error: "No caption variant available." },
      }));
      return;
    }

    setPostStates((prev) => ({
      ...prev,
      [asset.id]: { loading: true },
    }));

    const payload =
      asset.kind === "video"
        ? { videoUrl: asset.url, caption: post.caption, hashtags: post.hashtags }
        : { imageUrl: asset.url, caption: post.caption, hashtags: post.hashtags };

    try {
      const res = await fetch("/api/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(
          json.error ??
            "Instagram publish failed. Check that the upload URL is publicly accessible.",
        );
      }

      setPostStates((prev) => ({
        ...prev,
        [asset.id]: {
          loading: false,
          success: true,
          permalink: String(json.permalink ?? ""),
        },
      }));
    } catch (err: unknown) {
      setPostStates((prev) => ({
        ...prev,
        [asset.id]: {
          loading: false,
          success: false,
          error: err instanceof Error ? err.message : "Instagram publish failed",
        },
      }));
    }
  }

  async function handlePostAll() {
    if (!pairedAssets.length || !postingEnabled || batchPosting) {
      return;
    }

    setBatchPosting(true);

    try {
      for (let i = 0; i < pairedAssets.length; i += 1) {
        const item = pairedAssets[i];
        setBatchProgress(`Posting ${i + 1}/${pairedAssets.length}...`);
        await postAsset(item.asset, item.selectedIndex);
        if (i < pairedAssets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }
      setBatchProgress("Done posting all selected assets.");
    } finally {
      setBatchPosting(false);
    }
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
        <Card title="Campaign Brief" status={data.ads?.status}>
          <div className="mb-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadCampaignBrief}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
              disabled={!data.ads?.campaignBrief?.html}
            >
              Download Campaign Brief
            </button>
            <a
              href={data.ads?.campaignBrief?.pixeroUrl || "https://pixero.ai"}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200"
            >
              Open in Pixero
            </a>
          </div>
          {data.ads?.campaignBrief?.summary ? (
            <p className="text-sm text-zinc-300">{data.ads.campaignBrief.summary}</p>
          ) : (
            <p className="text-sm text-zinc-500">
              Campaign summary unavailable.
            </p>
          )}
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-zinc-400">
            <li>Step 1: Download your campaign brief below.</li>
            <li>
              Step 2: Open{" "}
              <a
                href="https://pixero.ai"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-200 underline"
              >
                Pixero
              </a>{" "}
              and drop the brief to generate ad creatives.
            </li>
            <li>Step 3: Download the generated images from Pixero.</li>
            <li>Step 4: Drop the images below to post them to Instagram.</li>
          </ol>
        </Card>
      </Section>

      {/* Instagram Posts */}
      <Section title="📸 Instagram Posts">
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

      {/* Post to Instagram */}
      <Section title="📸 Post to Instagram">
        <Card title="Drag & Drop Pixero Creatives">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePostAll}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
              disabled={!pairedAssets.length || !postingEnabled || batchPosting || !instagramPosts.length}
            >
              {batchPosting ? "Posting..." : "Post All to Instagram"}
            </button>
            <p className="text-xs text-zinc-400">{postingHint}</p>
          </div>
          {batchProgress && <p className="mb-3 text-xs text-zinc-300">{batchProgress}</p>}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="rounded-xl border border-dashed border-zinc-600 bg-zinc-950 p-6 text-center transition hover:border-zinc-400"
          >
            <p className="text-sm text-zinc-200">Drag & drop JPG/PNG/WEBP/MP4 files here</p>
            <p className="mt-1 text-xs text-zinc-400">or use file picker / paste URL below</p>
            <input
              type="file"
              accept={SUPPORTED_FILE_TYPES}
              multiple
              className="mx-auto mt-4 block w-full max-w-xs text-xs text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-black"
              onChange={(e) => {
                if (e.target.files) {
                  void uploadFiles(e.target.files);
                }
              }}
            />
            <div className="mx-auto mt-4 flex w-full max-w-xl gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste image/video URL"
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={handleUrlAdd}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300"
              >
                Add URL
              </button>
            </div>
          </div>
          {uploading && <p className="mt-3 text-xs text-zinc-400">Uploading...</p>}
          {uploadError && <p className="mt-3 text-xs text-red-400">{uploadError}</p>}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {pairedAssets.map(({ asset, selectedIndex, post }) => {
              const state = postStates[asset.id];
              return (
                <div
                  key={asset.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
                >
                  <div className="mb-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                    {asset.kind === "video" ? (
                      <video src={asset.url} controls className="h-48 w-full object-cover" />
                    ) : (
                      <img src={asset.url} alt={asset.name} className="h-48 w-full object-cover" />
                    )}
                  </div>
                  <p className="truncate text-xs text-zinc-500">{asset.name}</p>
                  <label className="mt-2 block text-xs text-zinc-400">
                    Caption Variant
                    <select
                      value={selectedIndex}
                      onChange={(e) =>
                        setCaptionSelection((prev) => ({
                          ...prev,
                          [asset.id]: Number(e.target.value),
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs text-zinc-200"
                      disabled={!instagramPosts.length || batchPosting}
                    >
                      {instagramPosts.map((captionPost, index) => (
                        <option key={`${asset.id}-${index}`} value={index}>
                          {`Variant ${index + 1} - ${captionPost.hookStyle}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  {post ? (
                    <>
                      <p className="mt-2 text-sm text-zinc-200 whitespace-pre-line">
                        {post.caption}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400">
                        {post.hashtags.map((tag) => `#${tag}`).join(" ")}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">
                      No caption variants available from campaign output.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void postAsset(asset, selectedIndex)}
                    className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                    disabled={!postingEnabled || batchPosting || !post || state?.loading}
                  >
                    {state?.loading ? "Posting..." : "Post to @wazzat7"}
                  </button>
                  {state?.success && state.permalink && (
                    <p className="mt-2 text-xs text-green-400">
                      ✅ Posted.{" "}
                      <a
                        href={state.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        View on Instagram
                      </a>
                    </p>
                  )}
                  {state?.success === false && state.error && (
                    <p className="mt-2 text-xs text-red-400">❌ {state.error}</p>
                  )}
                </div>
              );
            })}
          </div>
          {!pairedAssets.length && (
            <p className="mt-4 text-sm text-zinc-500">
              Upload Pixero-generated creatives to pair with captions before posting.
            </p>
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
