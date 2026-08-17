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

async function signUp(page: Page, email: string, name = "Driver") {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/");
}

async function addCar(page: Page, model = "Supra") {
  await page.goto("/my-garage");
  await page.getByRole("button", { name: "Add car" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Make").fill("Toyota");
  await dialog.getByLabel("Model").fill(model);
  await dialog.getByLabel("Year").fill("2023");
  await dialog.getByLabel("Horsepower").fill("382");
  await dialog.getByRole("button", { name: "Add car" }).click();
  await expect(
    page.getByText(`2023 Toyota ${model}`, { exact: true }),
  ).toBeVisible();
}

async function seedLeaderboard() {
  const track = await prisma.track.create({
    data: {
      name: "Spa-Francorchamps",
      country: "Belgium",
      length: 7000,
      corners: 20,
      elevation: 100,
    },
  });
  return prisma.leaderboard.create({
    data: { title: "Fastest overall", trackId: track.id },
  });
}

test.beforeEach(async () => {
  await prisma.leaderboardEntry.deleteMany();
  await prisma.leaderboard.deleteMany();
  await prisma.track.deleteMany();
  await prisma.car.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("a user sets a time with a garage car and it appears ranked on the leaderboard", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver1@example.com");
  await addCar(page);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Set a time" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("18");
  await dialog.getByLabel("Millis").fill("760");
  await dialog.getByRole("button", { name: "Set time" }).click();

  await expect(page.getByText("2:18.760")).toBeVisible();
  await expect(page.getByText("2023 Toyota Supra")).toBeVisible();
  await expect(page.getByText("382 hp")).toBeVisible();
});

test("a user cannot set two times with the same car on the same leaderboard", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver2@example.com");
  await addCar(page);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Set a time" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("18");
  await dialog.getByLabel("Millis").fill("760");
  await dialog.getByRole("button", { name: "Set time" }).click();
  await expect(page.getByText("2:18.760")).toBeVisible();

  await expect(
    page.getByText("All your cars already have a time here."),
  ).toBeVisible();

  const entryCount = await prisma.leaderboardEntry.count();
  expect(entryCount).toBe(1);
});

test("submitting the set-time dialog after a race creates a duplicate entry for the same car is rejected server-side", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  const email = "driver7@example.com";
  await signUp(page, email);
  await addCar(page);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Set a time" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("18");
  await dialog.getByLabel("Millis").fill("760");

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const car = await prisma.car.findFirstOrThrow({
    where: { ownerId: user.id },
  });
  await prisma.leaderboardEntry.create({
    data: {
      leaderboardId: leaderboard.id,
      driverId: user.id,
      carId: car.id,
      timeMs: 999000,
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

  await dialog.getByRole("button", { name: "Set time" }).click();

  await expect(
    dialog.getByText("This car already has a time on this leaderboard"),
  ).toBeVisible();
  await expect(dialog).toBeVisible();
});

test("a user sets times with two different cars and both are ranked correctly", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver3@example.com");
  await addCar(page, "Supra");
  await addCar(page, "GR86");

  await page.goto(`/leaderboards/${leaderboard.id}`);

  await page.getByRole("button", { name: "Set a time" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Car").selectOption({ label: "2023 Toyota Supra" });
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("20");
  await dialog.getByLabel("Millis").fill("000");
  await dialog.getByRole("button", { name: "Set time" }).click();
  await expect(page.getByText("2:20.000")).toBeVisible();

  await page.getByRole("button", { name: "Set a time" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Car").selectOption({ label: "2023 Toyota GR86" });
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("15");
  await dialog.getByLabel("Millis").fill("000");
  await dialog.getByRole("button", { name: "Set time" }).click();
  await expect(page.getByText("2:15.000")).toBeVisible();

  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("2:15.000");
  await expect(rows.nth(0)).toContainText("GR86");
  await expect(rows.nth(1)).toContainText("2:20.000");
  await expect(rows.nth(1)).toContainText("Supra");
});

test("a user removes their own entry after confirming", async ({ page }) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver4@example.com");
  await addCar(page);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Set a time" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("18");
  await dialog.getByLabel("Millis").fill("760");
  await dialog.getByRole("button", { name: "Set time" }).click();
  await expect(page.getByText("2:18.760")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(page.getByText("2:18.760")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("2:18.760")).toHaveCount(0);
  await expect(
    page.getByText("No times set yet — be the first."),
  ).toBeVisible();
});

test("editing or deleting the car afterward does not change the entry's displayed snapshot", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver5@example.com");
  await addCar(page);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Set a time" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("18");
  await dialog.getByLabel("Millis").fill("760");
  await dialog.getByRole("button", { name: "Set time" }).click();
  await expect(page.getByText("382 hp")).toBeVisible();

  await page.goto("/my-garage");
  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Horsepower").fill("999");
  await editDialog.getByRole("button", { name: "Save" }).click();

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await expect(page.getByText("382 hp")).toBeVisible();
  await expect(page.getByText("999 hp")).toHaveCount(0);

  await page.goto("/my-garage");
  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("2023 Toyota Supra")).toHaveCount(0);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await expect(page.getByText("2:18.760")).toBeVisible();
  await expect(page.getByText("382 hp")).toBeVisible();
});

test("a logged-out visitor sees full entry details and no set-time control", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  const owner = await prisma.user.create({
    data: {
      name: "Owner",
      email: "owner@example.com",
      passwordHash: await bcrypt.hash("password123", 12),
    },
  });
  const car = await prisma.car.create({
    data: {
      make: "Toyota",
      model: "Supra",
      year: 2023,
      horsepower: 382,
      drivetrain: "RWD",
      transmission: "AUTOMATIC",
      notes: "Track-prepped",
      ownerId: owner.id,
    },
  });
  await prisma.leaderboardEntry.create({
    data: {
      leaderboardId: leaderboard.id,
      driverId: owner.id,
      carId: car.id,
      timeMs: 138760,
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

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await expect(page.getByText("Owner")).toBeVisible();
  await expect(page.getByText("2023 Toyota Supra")).toBeVisible();
  await expect(page.getByText("382 hp")).toBeVisible();
  await expect(page.getByText("2:18.760")).toBeVisible();
  await expect(page.getByRole("button", { name: "Set a time" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Log in to set a time" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Notes" }).click();
  await expect(
    page.getByRole("dialog").getByText("Track-prepped"),
  ).toBeVisible();
});

test("a logged-in user with no cars sees a prompt instead of the set-time control", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver6@example.com");

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await expect(
    page.getByText("Add a car in My Garage to set a time."),
  ).toBeVisible();
});

test("a user cannot delete another user's entry, but an admin can", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  const owner = await prisma.user.create({
    data: {
      name: "Owner",
      email: "owner2@example.com",
      passwordHash: await bcrypt.hash("password123", 12),
    },
  });
  const car = await prisma.car.create({
    data: {
      make: "Toyota",
      model: "Supra",
      year: 2023,
      horsepower: 382,
      drivetrain: "RWD",
      transmission: "AUTOMATIC",
      ownerId: owner.id,
    },
  });
  await prisma.leaderboardEntry.create({
    data: {
      leaderboardId: leaderboard.id,
      driverId: owner.id,
      carId: car.id,
      timeMs: 138760,
      carMake: car.make,
      carModel: car.model,
      carYear: car.year,
      carHorsepower: car.horsepower,
      carDrivetrain: car.drivetrain,
      carTransmission: car.transmission,
    },
  });

  await signUp(page, "bystander@example.com");
  await page.goto(`/leaderboards/${leaderboard.id}`);
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);

  const admin = await createAdmin("admin@example.com");
  await page.context().clearCookies();
  await login(page, admin.email);
  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("2:18.760")).toHaveCount(0);
});
