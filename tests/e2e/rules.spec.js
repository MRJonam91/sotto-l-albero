import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const output = process.env.ARTIFACT_DIR || join(tmpdir(), "sotto-l-albero-qa");
mkdirSync(output, { recursive: true });

test("Il regolamento illustrato si legge e si condivide anche senza account", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto("/regolamento");
  await expect(
    page.getByRole("heading", { name: "Il regolamento del Secret Santa" }),
  ).toBeVisible();
  const steps = page.getByRole("list", {
    name: "I sei passi del Secret Santa",
  });
  await expect(steps.getByRole("listitem")).toHaveCount(6);
  await expect(steps.locator("svg")).toHaveCount(6);
  await expect(steps.getByText(/tra 15 e 25 euro/)).toBeVisible();
  await expect(steps.getByText(/Per Marco/)).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(violations.map(({ id }) => id)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(output, "regolamento-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({
    path: join(output, "regolamento-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Torna alla home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("La home del gruppo mostra il nuovo testo e il link al regolamento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 820 });
  const email = `rules-${Date.now()}@example.test`;
  const request = await page.request.post("/api/auth/request", {
    data: { email, name: "Nina", phone: "+393200000000" },
  });
  expect(request.ok()).toBeTruthy();
  const { devCode } = await request.json();
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: devCode },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Gestisci i tuoi gruppi Secret Santa con tutta la magia del Natale",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Crea e condividi i tuoi gruppi. Giocate insieme e organizzate lo scambio.",
    ),
  ).toBeVisible();
  const guide = page
    .locator(".hero")
    .getByRole("link", { name: "Regolamento del Secret Santa" });
  await expect(guide).toBeInViewport();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await guide.click();
  await expect(page).toHaveURL(/\/regolamento$/);
  await expect(
    page.getByRole("heading", { name: "Il regolamento del Secret Santa" }),
  ).toBeVisible();
});
