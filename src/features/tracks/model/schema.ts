import { z } from "zod";

export const trackSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  country: z.string().trim().min(1, "Country is required"),
  length: z.coerce.number().int().positive("Length must be greater than 0"),
  corners: z.coerce
    .number()
    .int()
    .positive("Corners must be greater than 0"),
  elevation: z.coerce
    .number()
    .int()
    .positive("Elevation must be greater than 0"),
});

export type TrackInput = z.infer<typeof trackSchema>;
