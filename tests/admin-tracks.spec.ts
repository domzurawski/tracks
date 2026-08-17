import { expect, test, type Locator, type Page } from "@playwright/test";
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

async function addTrack(dialog: Locator) {
  await dialog.getByLabel("Name").fill("Nürburgring Nordschleife");
  await dialog.getByLabel("Country").fill("Germany");
  await dialog.getByLabel("Length (meters)").fill("20800");
  await dialog.getByLabel("Corners").fill("154");
  await dialog.getByLabel("Elevation (meters)").fill("300");
  await dialog.getByRole("button", { name: "Add track" }).click();
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

test("an admin adding a track shows it in the admin list and the public tracks page", async ({
  page,
}) => {
  const admin = await createAdmin("admin1@example.com");
  await login(page, admin.email);
  await page.goto("/admin/tracks");

  await page.getByRole("button", { name: "Add track" }).click();
  await addTrack(page.getByRole("dialog"));

  await expect(page.getByText("Nürburgring Nordschleife")).toBeVisible();
  await expect(page.getByText("20.8 km")).toBeVisible();

  await page.goto("/tracks");
  await expect(page.getByText("Nürburgring Nordschleife")).toBeVisible();
});

test("an admin editing a track updates the list", async ({ page }) => {
  const admin = await createAdmin("admin2@example.com");
  await login(page, admin.email);
  await page.goto("/admin/tracks");

  await page.getByRole("button", { name: "Add track" }).click();
  await addTrack(page.getByRole("dialog"));
  await expect(page.getByText("Nürburgring Nordschleife")).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Name").fill("Nürburgring GP");
  await editDialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Nürburgring GP")).toBeVisible();
});

test("an admin deleting a track requires confirmation and removes it everywhere", async ({
  page,
}) => {
  const admin = await createAdmin("admin3@example.com");
  await login(page, admin.email);
  await page.goto("/admin/tracks");

  await page.getByRole("button", { name: "Add track" }).click();
  await addTrack(page.getByRole("dialog"));
  await expect(page.getByText("Nürburgring Nordschleife")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(page.getByText("Nürburgring Nordschleife")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("Nürburgring Nordschleife")).toHaveCount(0);

  await page.goto("/tracks");
  await expect(page.getByText("Nürburgring Nordschleife")).toHaveCount(0);
});

test("submitting the add track form without required fields shows a field error and creates nothing", async ({
  page,
}) => {
  const admin = await createAdmin("admin4@example.com");
  await login(page, admin.email);
  await page.goto("/admin/tracks");

  await page.getByRole("button", { name: "Add track" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add track" })
    .click();

  await expect(page.getByText("Name is required")).toBeVisible();

  const trackCount = await prisma.track.count();
  expect(trackCount).toBe(0);
});

test("a regular user cannot reach the admin tracks page", async ({
  page,
}) => {
  await signUp(page, "user1@example.com");
  const response = await page.goto("/admin/tracks");
  expect(response?.status()).toBe(404);
});

test("a logged-out visitor cannot reach the admin tracks page", async ({
  page,
}) => {
  const response = await page.goto("/admin/tracks");
  expect(response?.status()).toBe(404);
});

test("a logged-out visitor can browse the public tracks page", async ({
  page,
}) => {
  await prisma.track.create({
    data: {
      name: "Spa-Francorchamps",
      country: "Belgium",
      length: 7000,
      corners: 20,
      elevation: 100,
    },
  });

  await page.goto("/tracks");
  await expect(page.getByText("Spa-Francorchamps")).toBeVisible();
});
