"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/shared/lib/session";
import { leaderboardSchema } from "./schema";
import type { LeaderboardInput } from "./schema";

type LeaderboardActionResult = {
  fieldErrors?: Partial<Record<keyof LeaderboardInput, string>>;
  rootError?: string;
} | void;

function revalidateLeaderboardPaths() {
  revalidatePath("/");
  revalidatePath("/leaderboards");
  revalidatePath("/admin/leaderboards");
}

export async function createLeaderboard(
  input: LeaderboardInput,
): Promise<LeaderboardActionResult> {
  const parsed = leaderboardSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.leaderboard.create({ data: parsed.data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        fieldErrors: {
          title: "This track already has a leaderboard with that title",
        },
      };
    }
    throw error;
  }

  revalidateLeaderboardPaths();
}

export async function updateLeaderboard(
  id: string,
  input: LeaderboardInput,
): Promise<LeaderboardActionResult> {
  const parsed = leaderboardSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.leaderboard.update({ where: { id }, data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          fieldErrors: {
            title: "This track already has a leaderboard with that title",
          },
        };
      }
      if (error.code === "P2025") {
        return { rootError: "Leaderboard not found" };
      }
    }
    throw error;
  }

  revalidateLeaderboardPaths();
}

export async function deleteLeaderboard(
  id: string,
): Promise<{ rootError?: string } | void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.leaderboard.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { rootError: "Leaderboard not found" };
    }
    throw error;
  }

  revalidateLeaderboardPaths();
}
