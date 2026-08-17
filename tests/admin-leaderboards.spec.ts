import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL,
});

async function createAdmin(email: string) {
  return prisma.user.create({
    data: {
      name: "Site Admin",
      email,
      passwordHash: await bcrypt.hash("password123", 12),
      role: "ADMIN",
    },
  });
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/");
}

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Regular User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");
}

test.beforeEach(async () => {
  await prisma.leaderboard.deleteMany();
  await prisma.track.deleteMany();
  await prisma.car.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("an admin adding a leaderboard shows it in the admin list and the public leaderboards page", async ({
  page,
}) => {
  await prisma.track.create({
    data: {
      name: "Circuit de la Sarthe",
      country: "France",
      length: 13600,
      corners: 38,
      elevation: 30,
    },
  });
  const admin = await createAdmin("admin1@example.com");
  await login(page, admin.email);
  await page.goto("/admin/leaderboards");

  await page.getByRole("button", { name: "Add leaderboard" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Fastest overall");
  await dialog
    .getByLabel("Track")
    .selectOption({ label: "Circuit de la Sarthe" });
  await dialog.getByRole("button", { name: "Add leaderboard" }).click();

  await expect(page.getByText("Fastest overall")).toBeVisible();
  await expect(page.getByText("Circuit de la Sarthe")).toBeVisible();

  await page.goto("/leaderboards");
  await expect(page.getByText("Fastest overall")).toBeVisible();
});

test("an admin editing a leaderboard updates the list", async ({ page }) => {
  await prisma.track.create({
    data: {
      name: "Circuit de la Sarthe",
      country: "France",
      length: 13600,
      corners: 38,
      elevation: 30,
    },
  });
  const admin = await createAdmin("admin2@example.com");
  await login(page, admin.email);
  await page.goto("/admin/leaderboards");

  await page.getByRole("button", { name: "Add leaderboard" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Fastest overall");
  await dialog
    .getByLabel("Track")
    .selectOption({ label: "Circuit de la Sarthe" });
  await dialog.getByRole("button", { name: "Add leaderboard" }).click();
  await expect(page.getByText("Fastest overall")).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Title").fill("Fastest RWD");
  await editDialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Fastest RWD")).toBeVisible();
});

test("an admin deleting a leaderboard requires confirmation and removes it everywhere", async ({
  page,
}) => {
  await prisma.track.create({
    data: {
      name: "Circuit de la Sarthe",
      country: "France",
      length: 13600,
      corners: 38,
      elevation: 30,
    },
  });
  const admin = await createAdmin("admin3@example.com");
  await login(page, admin.email);
  await page.goto("/admin/leaderboards");

  await page.getByRole("button", { name: "Add leaderboard" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Fastest overall");
  await dialog
    .getByLabel("Track")
    .selectOption({ label: "Circuit de la Sarthe" });
  await dialog.getByRole("button", { name: "Add leaderboard" }).click();
  await expect(page.getByText("Fastest overall")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(page.getByText("Fastest overall")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("Fastest overall")).toHaveCount(0);

  await page.goto("/leaderboards");
  await expect(page.getByText("Fastest overall")).toHaveCount(0);
});

test("submitting the add leaderboard form without a title shows a field error and creates nothing", async ({
  page,
}) => {
  await prisma.track.create({
    data: {
      name: "Circuit de la Sarthe",
      country: "France",
      length: 13600,
      corners: 38,
      elevation: 30,
    },
  });
  const admin = await createAdmin("admin4@example.com");
  await login(page, admin.email);
  await page.goto("/admin/leaderboards");

  await page.getByRole("button", { name: "Add leaderboard" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add leaderboard" })
    .click();

  await expect(page.getByText("Title is required")).toBeVisible();

  const leaderboardCount = await prisma.leaderboard.count();
  expect(leaderboardCount).toBe(0);
});

test("a regular user cannot reach the admin leaderboards page", async ({
  page,
}) => {
  await signUp(page, "user1@example.com");
  const response = await page.goto("/admin/leaderboards");
  expect(response?.status()).toBe(404);
});

test("a logged-out visitor cannot reach the admin leaderboards page", async ({
  page,
}) => {
  const response = await page.goto("/admin/leaderboards");
  expect(response?.status()).toBe(404);
});

test("a logged-out visitor can browse the public leaderboards page", async ({
  page,
}) => {
  const track = await prisma.track.create({
    data: {
      name: "Spa-Francorchamps",
      country: "Belgium",
      length: 7000,
      corners: 20,
      elevation: 100,
    },
  });
  await prisma.leaderboard.create({
    data: { title: "Fastest overall", trackId: track.id },
  });

  await page.goto("/leaderboards");
  await expect(page.getByText("Fastest overall")).toBeVisible();
});
