import { z } from "zod";

export const leaderboardSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  trackId: z.string().trim().min(1, "Select a track"),
});

export type LeaderboardInput = z.infer<typeof leaderboardSchema>;

export const entrySchema = z
  .object({
    carId: z.string().trim().min(1, "Select a car"),
    minutes: z.coerce
      .number("Enter a valid time")
      .int("Enter a whole number")
      .min(0, "Enter a valid time")
      .max(999, "Enter a valid time"),
    seconds: z.coerce
      .number("Enter a valid time")
      .int("Enter a whole number")
      .min(0, "Enter a valid time")
      .max(59, "Enter a valid time"),
    milliseconds: z.coerce
      .number("Enter a valid time")
      .int("Enter a whole number")
      .min(0, "Enter a valid time")
      .max(999, "Enter a valid time"),
  })
  .refine(
    (data) =>
      data.minutes * 60000 + data.seconds * 1000 + data.milliseconds > 0,
    { message: "Time must be greater than zero", path: ["minutes"] },
  );

export type EntryInput = z.infer<typeof entrySchema>;
