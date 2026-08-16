import "server-only";
import { prisma } from "@/shared/lib/prisma";
import type { Car } from "./types";

export async function getCars(ownerId: string): Promise<Car[]> {
  return prisma.car.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCarCount(ownerId: string): Promise<number> {
  return prisma.car.count({ where: { ownerId } });
}
