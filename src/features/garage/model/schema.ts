import { z } from "zod";

export const carSchema = z.object({
  make: z.string().trim().min(1, "Make is required"),
  model: z.string().trim().min(1, "Model is required"),
  year: z.coerce
    .number()
    .int()
    .min(1900, "Enter a valid year")
    .max(new Date().getFullYear() + 1, "Enter a valid year"),
  horsepower: z.coerce
    .number()
    .int()
    .positive("Horsepower must be greater than 0"),
  drivetrain: z.enum(["FWD", "RWD", "AWD"], "Select a drivetrain"),
  transmission: z.enum(["MANUAL", "AUTOMATIC"], "Select a transmission"),
  nickname: z.string().trim(),
  photoUrl: z.union([z.url("Enter a valid URL"), z.literal("")]),
  notes: z.string().trim(),
});

export type CarInput = z.infer<typeof carSchema>;
