"use client";

import { useState } from "react";
import type { CampaignResult } from "@/lib/schemas/campaign";
import Results from "./results";

type Stage =
  | "idle"
  | "scraping"
  | "analyzing"
  | "generating"
  | "done"
  | "error";

const STAGE_LABELS: Record<Stage, string> = {
  idle: "",
  scraping: "🔍 Scraping TikTok, Instagram & store data…",
  analyzing: "🧠 Climate Advisory Board reviewing your brand…",
  generating: "📝 Generating campaign brief & Instagram posts…",
  done: "✅ Campaign ready!",
  error: "⚠️ Something went wrong",
};

export default function CampaignForm() {
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [error, setError] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    setError("");

    const formData = new FormData(e.currentTarget);
    const url = formData.get("url") as string;
    const niche = formData.get("niche") as string;

    try {
      setStage("scraping");

      // Simulate stage progression for UX (actual pipeline runs server-side)
      const stageTimer = setTimeout(() => setStage("analyzing"), 5000);
      const stageTimer2 = setTimeout(() => setStage("generating"), 12000);

      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, niche }),
      });

      clearTimeout(stageTimer);
      clearTimeout(stageTimer2);

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setStage("error");
        setError(
          json.error ??
            JSON.stringify(json.errors) ??
            "Campaign run failed",
        );
        return;
      }

      setStage("done");
      setResult(json.data as CampaignResult);
    } catch (err: unknown) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  function handleReset() {
    setStage("idle");
    setResult(null);
    setError("");
  }

  return (
    <div className="space-y-8">
      {/* Form */}
      <form
        className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="url">
            Store URL
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            defaultValue="https://save-the-bears-2.myshopify.com"
            disabled={stage !== "idle" && stage !== "done" && stage !== "error"}
            placeholder="https://yourstore.com"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 disabled:opacity-50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="niche">
            Niche
          </label>
          <input
            id="niche"
            name="niche"
            type="text"
            required
            defaultValue="wildlife conservation"
            disabled={stage !== "idle" && stage !== "done" && stage !== "error"}
            placeholder="Supplements, streetwear, skincare..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 disabled:opacity-50"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={stage !== "idle" && stage !== "done" && stage !== "error"}
            className="flex-1 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black disabled:opacity-50"
          >
            {stage === "idle" || stage === "done" || stage === "error"
              ? "Run Campaign"
              : "Running…"}
          </button>

          {(stage === "done" || stage === "error") && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Progress indicator */}
      {stage !== "idle" && stage !== "done" && stage !== "error" && (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
          <p className="text-sm text-zinc-300">{STAGE_LABELS[stage]}</p>
        </div>
      )}

      {/* Error */}
      {stage === "error" && error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && <Results data={result} />}
    </div>
  );
}
