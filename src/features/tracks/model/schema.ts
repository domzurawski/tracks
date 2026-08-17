import { z } from "zod";

export const trackSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  country: z.string().trim().min(1, "Country is required"),
  length: z.coerce
    .number("Enter a valid length")
    .int("Length must be a whole number")
    .positive("Length must be greater than 0"),
  corners: z.coerce
    .number("Enter a valid number")
    .int("Corners must be a whole number")
    .positive("Corners must be greater than 0"),
  elevation: z.union([
    z.literal(""),
    z.coerce
      .number("Enter a valid number")
      .int("Elevation must be a whole number")
      .nonnegative("Elevation must be 0 or greater"),
  ]),
});

export type TrackInput = z.infer<typeof trackSchema>;
