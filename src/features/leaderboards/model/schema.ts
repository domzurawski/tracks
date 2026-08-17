import { z } from "zod";

export const leaderboardSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  trackId: z.string().trim().min(1, "Select a track"),
});

export type LeaderboardInput = z.infer<typeof leaderboardSchema>;
