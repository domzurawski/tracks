"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/shared/lib/session";
import { entrySchema, leaderboardSchema } from "./schema";
import type { EntryInput, LeaderboardInput } from "./schema";

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

type EntryActionResult = {
  fieldErrors?: Partial<Record<keyof EntryInput, string>>;
  rootError?: string;
} | void;

function revalidateEntryPaths(leaderboardId: string) {
  revalidatePath("/");
  revalidatePath("/leaderboards");
  revalidatePath(`/leaderboards/${leaderboardId}`);
}

export async function createEntry(
  leaderboardId: string,
  input: EntryInput,
): Promise<EntryActionResult> {
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { rootError: "You must be logged in" };
  }

  const car = await prisma.car.findFirst({
    where: { id: parsed.data.carId, ownerId: user.id },
  });
  if (!car) {
    return { fieldErrors: { carId: "Car not found" } };
  }

  const timeMs =
    parsed.data.minutes * 60000 +
    parsed.data.seconds * 1000 +
    parsed.data.milliseconds;

  try {
    await prisma.leaderboardEntry.create({
      data: {
        leaderboardId,
        driverId: user.id,
        carId: car.id,
        timeMs,
        carMake: car.make,
        carModel: car.model,
        carYear: car.year,
        carHorsepower: car.horsepower,
        carDrivetrain: car.drivetrain,
        carTransmission: car.transmission,
        carNickname: car.nickname,
        carNotes: car.notes,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        fieldErrors: {
          carId: "This car already has a time on this leaderboard",
        },
      };
    }
    throw error;
  }

  revalidateEntryPaths(leaderboardId);
}

export async function deleteEntry(
  id: string,
): Promise<{ rootError?: string } | void> {
  const user = await getCurrentUser();
  if (!user) {
    return { rootError: "You must be logged in" };
  }

  const entry = await prisma.leaderboardEntry.findUnique({ where: { id } });
  if (!entry) {
    return { rootError: "Entry not found" };
  }

  if (entry.driverId !== user.id && user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.leaderboardEntry.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { rootError: "Entry not found" };
    }
    throw error;
  }

  revalidateEntryPaths(entry.leaderboardId);
}
