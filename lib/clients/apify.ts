export const apifyClient = {
  async getTrends({ url, niche }: { url: string; niche: string }) {
    return {
      source: "apify",
      note: "Stubbed trends + competitor scan",
      url,
      niche,
      competitors: ["Brand A", "Brand B", "Brand C"],
      trends: ["UGC-style ads", "Bundle offers", "Creator partnerships"],
    };
  },
};
