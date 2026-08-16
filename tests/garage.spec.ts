import { expect, test, type Locator, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL,
});

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Garage Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");
}

async function addCar(page: Page, dialog: Locator) {
  await dialog.getByLabel("Make").fill("Toyota");
  await dialog.getByLabel("Model").fill("Supra");
  await dialog.getByLabel("Year").fill("2023");
  await dialog.getByLabel("Horsepower").fill("382");
  await dialog.getByRole("button", { name: "Add car" }).click();
}

test.beforeEach(async () => {
  await prisma.car.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("adding a car shows it in the garage list", async ({ page }) => {
  await signUp(page, "owner1@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  await addCar(page, page.getByRole("dialog"));

  await expect(
    page.getByText("2023 Toyota Supra", { exact: true }),
  ).toBeVisible();
});

test("adding a car updates the homepage garage count", async ({ page }) => {
  await signUp(page, "owner2@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  await addCar(page, page.getByRole("dialog"));
  await expect(
    page.getByText("2023 Toyota Supra", { exact: true }),
  ).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(/1 cars/)).toBeVisible();
});

test("editing a car updates the list", async ({ page }) => {
  await signUp(page, "owner3@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  await addCar(page, page.getByRole("dialog"));
  await expect(
    page.getByText("2023 Toyota Supra", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Model").fill("GR86");
  await editDialog.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByText("2023 Toyota GR86", { exact: true }),
  ).toBeVisible();
});

test("deleting a car requires confirmation", async ({ page }) => {
  await signUp(page, "owner4@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  await addCar(page, page.getByRole("dialog"));
  await expect(
    page.getByText("2023 Toyota Supra", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(
    page.getByText("2023 Toyota Supra", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(
    page.getByText("2023 Toyota Supra", { exact: true }),
  ).toHaveCount(0);
});

test("submitting the add form without required fields shows a field error and creates nothing", async ({
  page,
}) => {
  await signUp(page, "owner5@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add car" })
    .click();

  await expect(page.getByText("Make is required")).toBeVisible();

  const carCount = await prisma.car.count();
  expect(carCount).toBe(0);
});

test("a user cannot see another user's car in their garage or homepage count", async ({
  page,
}) => {
  const ownerA = await prisma.user.create({
    data: {
      name: "Owner A",
      email: "ownerA@example.com",
      passwordHash: await bcrypt.hash("password123", 12),
    },
  });
  await prisma.car.create({
    data: {
      make: "Toyota",
      model: "Supra",
      year: 2023,
      horsepower: 382,
      drivetrain: "RWD",
      transmission: "AUTOMATIC",
      ownerId: ownerA.id,
    },
  });

  await signUp(page, "ownerB@example.com");
  await page.goto("/my-garage");

  await expect(
    page.getByText("No cars yet — add your first one."),
  ).toBeVisible();
  await expect(
    page.getByText("2023 Toyota Supra", { exact: true }),
  ).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByText(/0 cars/)).toBeVisible();
});

test("a car with a photo URL renders an image instead of the fallback icon", async ({
  page,
}) => {
  await signUp(page, "owner6@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Make").fill("Toyota");
  await dialog.getByLabel("Model").fill("Supra");
  await dialog.getByLabel("Year").fill("2023");
  await dialog.getByLabel("Horsepower").fill("382");
  await dialog
    .getByLabel("Photo URL")
    .fill("https://example.com/cars/supra.jpg");
  await dialog.getByRole("button", { name: "Add car" }).click();

  await expect(
    page.getByText("2023 Toyota Supra", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("img").first()).toBeVisible();
});
