import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL,
});

test.beforeEach(async () => {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("signup creates a user and session, then redirects to the homepage", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page).toHaveURL("/");

  const user = await prisma.user.findUnique({
    where: { email: "ada@example.com" },
  });
  expect(user).not.toBeNull();

  const sessionCount = await prisma.session.count({
    where: { userId: user!.id },
  });
  expect(sessionCount).toBe(1);
});

test("signup with a taken email shows a field error and creates nothing", async ({
  page,
}) => {
  await prisma.user.create({
    data: {
      name: "Existing",
      email: "taken@example.com",
      passwordHash: "x",
    },
  });

  await page.goto("/signup");
  await page.getByLabel("Name").fill("New Person");
  await page.getByLabel("Email").fill("taken@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(
    page.getByText("An account with this email already exists"),
  ).toBeVisible();

  const users = await prisma.user.findMany({
    where: { email: "taken@example.com" },
  });
  expect(users).toHaveLength(1);
});

test("login with a wrong password shows a generic error", async ({
  page,
}) => {
  await prisma.user.create({
    data: {
      name: "Real User",
      email: "real@example.com",
      passwordHash: await bcrypt.hash("correct-password", 12),
    },
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("real@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Invalid email or password")).toBeVisible();
});

test("/my-garage redirects to /login when logged out, and renders when logged in", async ({
  page,
}) => {
  await page.goto("/my-garage");
  await expect(page).toHaveURL("/login");

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Garage Owner");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/my-garage");
  await expect(page).toHaveURL("/my-garage");
  await expect(
    page.getByRole("heading", { name: /Garage Owner/ }),
  ).toBeVisible();
});

test("logout deletes the session and /my-garage redirects again", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Logout Tester");
  await page.getByLabel("Email").fill("logout@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

  const sessionCount = await prisma.session.count();
  expect(sessionCount).toBe(0);

  await page.goto("/my-garage");
  await expect(page).toHaveURL("/login");
});

test("/login and /signup redirect to / when already logged in", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Already In");
  await page.getByLabel("Email").fill("alreadyin@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/login");
  await expect(page).toHaveURL("/");

  await page.goto("/signup");
  await expect(page).toHaveURL("/");
});
