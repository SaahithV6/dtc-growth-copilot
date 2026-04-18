export const pixeroClient = {
  async generateAds({
    url,
    niche,
    trends,
    brandReview,
  }: {
    url: string;
    niche: string;
    trends: unknown;
    brandReview: unknown;
  }) {
    return {
      source: "pixero",
      campaignName: "Launch Blitz",
      hooks: ["Before/after hook", "Problem/solution hook"],
      creatives: [
        { format: "video", concept: "Creator unboxing" },
        { format: "static", concept: "Offer + benefit split" },
      ],
      url,
      niche,
      trends,
      brandReview,
    };
  },
};
