"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/shared/lib/session";
import { carSchema } from "./schema";
import type { CarInput } from "./schema";

type CarActionResult = {
  fieldErrors?: Partial<Record<keyof CarInput, string>>;
  rootError?: string;
} | void;

function toCarData(input: CarInput) {
  return {
    make: input.make,
    model: input.model,
    year: input.year,
    horsepower: input.horsepower,
    drivetrain: input.drivetrain,
    transmission: input.transmission,
    nickname: input.nickname || null,
    photoUrl: input.photoUrl || null,
    notes: input.notes || null,
  };
}

export async function createCar(input: CarInput): Promise<CarActionResult> {
  const parsed = carSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { rootError: "You must be logged in" };
  }

  await prisma.car.create({
    data: { ...toCarData(parsed.data), ownerId: user.id },
  });

  revalidatePath("/my-garage");
  revalidatePath("/");
}

export async function updateCar(
  id: string,
  input: CarInput,
): Promise<CarActionResult> {
  const parsed = carSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { rootError: "You must be logged in" };
  }

  const { count } = await prisma.car.updateMany({
    where: { id, ownerId: user.id },
    data: toCarData(parsed.data),
  });

  if (count === 0) {
    return { rootError: "Car not found" };
  }

  revalidatePath("/my-garage");
  revalidatePath("/");
}

export async function deleteCar(
  id: string,
): Promise<{ rootError?: string } | void> {
  const user = await getCurrentUser();
  if (!user) {
    return { rootError: "You must be logged in" };
  }

  const { count } = await prisma.car.deleteMany({
    where: { id, ownerId: user.id },
  });

  if (count === 0) {
    return { rootError: "Car not found" };
  }

  revalidatePath("/my-garage");
  revalidatePath("/");
}
