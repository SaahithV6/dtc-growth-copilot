export const mindsClient = {
  async reviewBrand({
    url,
    niche,
    trends,
  }: {
    url: string;
    niche: string;
    trends: unknown;
  }) {
    return {
      source: "minds.ai",
      score: 8.6,
      summary:
        "Strong visual identity; recommend clearer differentiation in hero messaging.",
      url,
      niche,
      trends,
    };
  },
};
