import "server-only";
import { cache } from "react";
import { prisma } from "@/shared/lib/prisma";
import type { Leaderboard } from "./types";

export async function getLeaderboards(): Promise<Leaderboard[]> {
  const leaderboards = await prisma.leaderboard.findMany({
    orderBy: { createdAt: "desc" },
    include: { track: { select: { name: true } } },
  });

  return leaderboards.map((leaderboard) => ({
    id: leaderboard.id,
    title: leaderboard.title,
    trackId: leaderboard.trackId,
    trackName: leaderboard.track.name,
  }));
}

export const getLeaderboard = cache(
  async (id: string): Promise<Leaderboard | null> => {
    const leaderboard = await prisma.leaderboard.findUnique({
      where: { id },
      include: { track: { select: { name: true } } },
    });

    if (!leaderboard) return null;

    return {
      id: leaderboard.id,
      title: leaderboard.title,
      trackId: leaderboard.trackId,
      trackName: leaderboard.track.name,
    };
  },
);
