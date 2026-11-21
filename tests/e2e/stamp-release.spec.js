import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({
  viewport: { width: 320, height: 840 },
  reducedMotion: "reduce",
  hasTouch: true,
});

test("nuovi timbri diluiti, raccolta dal sito e sorpresa rileggibile da mobile", async ({
  page,
}) => {
  const email = `stamp-release-${Date.now()}@example.test`;
  const { devCode } = await page.request
    .post("/api/auth/request", { data: { email, name: "Ada Timbri" } })
    .then((r) => r.json());
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: devCode },
      })
    ).ok(),
  ).toBe(true);
  const future = (days) =>
    new Date(Date.now() + days * 86_400_000).toISOString();
  expect(
    (
      await page.request.post("/api/events", {
        data: {
          name: "Natale dei timbri",
          organizerParticipates: true,
          budget: 20,
          closeAt: future(1),
          drawAt: future(2),
          giftAt: future(20),
        },
      })
    ).ok(),
  ).toBe(true);
  const { release } = await page.request
    .get("/api/stamps")
    .then((r) => r.json());
  expect(release.availableIds).toEqual(["office_ipod"]);
  expect(release.nextDate).toBeTruthy();
  const early = await page.request.post("/api/stamps", {
    data: { stamp: "polar_bell" },
  });
  expect(early.status()).toBe(409);

  await page.goto("/profilo#album");
  const series = page.getByRole("region", { name: "Aspettando i pacchi" });
  await expect(series).toContainText("1 di 10");
  await expect(series).toContainText("Prossima uscita");
  await expect(series.locator(".stamp-tile")).toHaveCount(1);
  await expect(
    page.locator(".stamp-album > .stamp-grid .stamp-tile"),
  ).toHaveCount(12);

  // Fix the browser clock at 19:30 Rome time to check the original evening sighting.
  await page.clock.setFixedTime(new Date("2026-11-21T18:30:00Z"));
  await page
    .getByRole("button", { name: "Sotto l’Albero, pagina iniziale" })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#main")).toBeFocused();
  const home = page.locator(".hero");
  await expect(home.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Natale dei timbri/ }),
  ).toBeVisible();
  const star = home.getByRole("button", { name: "Una stella da accendere" });
  const ipod = home.locator('[data-stamp="office_ipod"]');
  await star.click({ trial: true });
  await home.locator('[data-stamp="reindeer"]').click({ trial: true });
  await ipod.click({ trial: true });

  await star.click();
  await expect(page.getByRole("dialog")).toContainText("Timbro raccolto");
  await page.keyboard.press("Escape");
  await ipod.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("The Office");
  await expect(dialog.getByRole("link")).toHaveAttribute("href", /^https:\/\//);
  await expect(dialog).toContainText("Timbro raccolto");
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-stamp="office_ipod"]')).toHaveCount(0);
  await home
    .getByRole("button", { name: "Caccia al tesoro e album dei timbri" })
    .click();
  await expect(page).toHaveURL(/\/profilo#album$/);
  await expect(page.getByRole("heading", { name: "Stella d’oro" })).toBeVisible();
  await expect(
    series.getByRole("button", { name: /Rileggi la sorpresa/ }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Stella d’oro" })).toBeVisible();
  await series.getByRole("button", { name: /Rileggi la sorpresa/ }).click();
  await expect(page.getByRole("dialog")).toContainText("The Office");
  await page.keyboard.press("Escape");
  const a11y = await new AxeBuilder({ page })
    .include(".stamp-album")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
