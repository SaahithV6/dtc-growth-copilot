import { z } from "zod";

export const runRequestSchema = z.object({
  url: z.string().url(),
  niche: z.string().min(2),
});
