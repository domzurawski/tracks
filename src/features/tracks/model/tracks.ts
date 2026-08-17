import "server-only";
import { prisma } from "@/shared/lib/prisma";
import type { Track } from "./types";

export async function getTracks(): Promise<Track[]> {
  return prisma.track.findMany({ orderBy: { name: "asc" } });
}
