export const elevenLabsClient = {
  async optionalVoiceover({ ads }: { ads: unknown }) {
    return {
      source: "elevenlabs",
      status: "skipped",
      note: "Enable when ELEVENLABS_API_KEY is set.",
      ads,
    };
  },
};
