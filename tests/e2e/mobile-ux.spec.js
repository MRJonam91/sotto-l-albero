import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

test.use({
  viewport: { width: 320, height: 740 },
  hasTouch: true,
  reducedMotion: "reduce",
});

async function profileFixture(page) {
  const email = `mobile-ux-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const started = await page.request.post("/api/auth/request", {
    data: { email, name: "Ada Mobile" },
  });
  const { devCode } = await started.json();
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: devCode },
      })
    ).ok(),
  ).toBe(true);
  const photo = await sharp({
    create: { width: 256, height: 256, channels: 3, background: "#527a68" },
  })
    .webp()
    .toBuffer();
  expect(
    (
      await page.request.post("/api/profile/avatar", {
        data: {
          kind: "photo",
          value: `data:image/webp;base64,${photo.toString("base64")}`,
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.put("/api/profile", {
        data: {
          holidayProfile: {
            quote: "Un regalo pensato con calma",
            activity: "Preparo biscotti per gli amici",
            iconMessage: ["cookie", "gift"],
            iconCaption: "Dolci e pensieri",
            answers: { soundtrack: "jazz_fireplace" },
            portraitApproved: false,
          },
          dailyCheckinAction: "complete",
        },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/profilo");
  await expect(
    page.getByRole("heading", { name: "Il mio profilo" }),
  ).toBeVisible();
  return photo;
}

test("avatar e immagini mantengono proporzioni e il profilo non sborda", async ({
  page,
}) => {
  await profileFixture(page);
  for (const width of [320, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 840 });
    const avatar = page.locator(".site-header .member-avatar");
    const box = await avatar.boundingBox();
    expect(Math.abs(box.width - box.height)).toBeLessThan(1);
    const image = await avatar.locator("img").boundingBox();
    expect(Math.abs(image.width - image.height)).toBeLessThan(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const button = await page
      .getByRole("button", { name: "Apri il mio profilo" })
      .boundingBox();
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
  }
});

test("stato e descrizione salvati restano visibili al proprietario anche con ritratto privato", async ({
  page,
}) => {
  await profileFixture(page);
  const summary = page.getByRole("region", {
    name: "Il tuo Natale",
    exact: true,
  });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("Un regalo pensato con calma");
  await expect(summary).toContainText("Preparo biscotti per gli amici");
  await expect(summary).toContainText("Ritratto visibile solo a te");
  await expect(summary.locator(".holiday-summary-description")).not.toBeEmpty();
  await expect(
    summary.getByRole("link", { name: "Modifica stato e ritratto" }),
  ).toBeVisible();
  await page.reload();
  await expect(summary).toContainText("Un regalo pensato con calma");
  const a11y = await new AxeBuilder({ page })
    .include(".holiday-profile-summary")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
});

test("ritaglio mobile tiene anteprima e regolazioni nello stesso schermo", async ({
  page,
}) => {
  const photo = await profileFixture(page);
  await page.route("**/avatar-models/*.tflite", (route) => route.abort());
  await page.getByRole("button", { name: "Usa una foto", exact: true }).click();
  await page.getByLabel("Scegli una foto", { exact: true }).setInputFiles({
    name: "foto-qa.png",
    mimeType: "image/png",
    buffer: await sharp(photo).png().toBuffer(),
  });
  const stage = page.locator(".photo-framing-stage");
  await expect(stage).toBeVisible();
  await stage.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const rect = document
      .querySelector(".photo-framing-stage")
      .getBoundingClientRect();
    window.scrollBy(0, rect.top - 12);
  });
  const preview = await stage.locator(".photo-preview > canvas").boundingBox();
  const controls = await stage.locator(".photo-range-controls").boundingBox();
  expect(preview.y).toBeGreaterThanOrEqual(0);
  expect(controls.y + controls.height).toBeLessThanOrEqual(740);
  expect(controls.y - (preview.y + preview.height)).toBeLessThan(60);
  await stage.getByRole("slider", { name: /Sposta a sinistra/ }).focus();
  await page.keyboard.press("ArrowRight");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
