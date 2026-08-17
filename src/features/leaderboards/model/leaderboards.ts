import "server-only";
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
