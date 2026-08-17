"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/shared/lib/session";
import { trackSchema } from "./schema";
import type { TrackInput } from "./schema";

type TrackActionResult = {
  fieldErrors?: Partial<Record<keyof TrackInput, string>>;
  rootError?: string;
} | void;

function revalidateTrackPaths() {
  revalidatePath("/");
  revalidatePath("/tracks");
  revalidatePath("/admin/tracks");
}

function revalidateLeaderboardPaths() {
  revalidatePath("/leaderboards");
  revalidatePath("/admin/leaderboards");
}

function toTrackData(input: TrackInput) {
  return {
    name: input.name,
    country: input.country,
    length: input.length,
    corners: input.corners,
    elevation: input.elevation === "" ? null : input.elevation,
  };
}

export async function createTrack(
  input: TrackInput,
): Promise<TrackActionResult> {
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.track.create({ data: toTrackData(parsed.data) });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        fieldErrors: { name: "A track with this name already exists" },
      };
    }
    throw error;
  }

  revalidateTrackPaths();
}

export async function updateTrack(
  id: string,
  input: TrackInput,
): Promise<TrackActionResult> {
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.track.update({
      where: { id },
      data: toTrackData(parsed.data),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          fieldErrors: { name: "A track with this name already exists" },
        };
      }
      if (error.code === "P2025") {
        return { rootError: "Track not found" };
      }
    }
    throw error;
  }

  revalidateTrackPaths();
  revalidateLeaderboardPaths();
}

export async function deleteTrack(
  id: string,
): Promise<{ rootError?: string } | void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.track.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { rootError: "Track not found" };
    }
    throw error;
  }

  revalidateTrackPaths();
  revalidateLeaderboardPaths();
}
