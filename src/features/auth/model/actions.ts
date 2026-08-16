"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { loginSchema, signupSchema } from "./schema";
import type { LoginInput, SignupInput } from "./schema";
import { createSession, deleteSession } from "./session";

const BCRYPT_COST = 12;

const DUMMY_PASSWORD_HASH = await bcrypt.hash(
  "dummy-password-for-timing-safety",
  BCRYPT_COST,
);

type ActionResult = {
  fieldErrors?: { email?: string; password?: string };
  rootError?: string;
} | void;

export async function signup(input: SignupInput): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
      },
    });
    userId = user.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        fieldErrors: { email: "An account with this email already exists" },
      };
    }
    throw error;
  }

  await createSession(userId);
  redirect("/");
}

export async function login(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid email or password" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    return { rootError: "Invalid email or password" };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/");
}
