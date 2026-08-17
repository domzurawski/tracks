import "server-only";
import { prisma } from "@/shared/lib/prisma";
import type { LeaderboardEntry } from "./types";

export async function getEntries(
  leaderboardId: string,
): Promise<LeaderboardEntry[]> {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { leaderboardId },
    orderBy: [{ timeMs: "asc" }, { createdAt: "asc" }],
    include: { driver: { select: { name: true } } },
  });

  return entries.map((entry) => ({
    id: entry.id,
    leaderboardId: entry.leaderboardId,
    driverId: entry.driverId,
    driverName: entry.driver.name,
    carId: entry.carId,
    timeMs: entry.timeMs,
    carMake: entry.carMake,
    carModel: entry.carModel,
    carYear: entry.carYear,
    carHorsepower: entry.carHorsepower,
    carDrivetrain: entry.carDrivetrain,
    carTransmission: entry.carTransmission,
    carNickname: entry.carNickname,
    carNotes: entry.carNotes,
    createdAt: entry.createdAt,
  }));
}
