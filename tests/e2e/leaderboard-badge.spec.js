import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { badgeTextModes } from "../../shared/badges.js";

test.use({ hasTouch: true, reducedMotion: "reduce" });

test("targhette e nomi lunghi restano nella riga della classifica su smartphone", async ({
  page,
}) => {
  const email = `badge-overflow-${Date.now()}@example.test`;
  const name = "Alessandra Francesca Maria Delle Stelle di Natale";
  const { devCode } = await page.request
    .post("/api/auth/request", { data: { email, name } })
    .then((r) => r.json());
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: devCode },
      })
    ).ok(),
  ).toBe(true);
  const future = (d) => new Date(Date.now() + d * 86400000).toISOString();
  const { event } = await page.request
    .post("/api/events", {
      data: {
        name: "Targhette su smartphone",
        organizerParticipates: true,
        budget: 20,
        closeAt: future(1),
        drawAt: future(2),
        giftAt: future(10),
      },
    })
    .then((r) => r.json());
  for (const badgeText of badgeTextModes) {
    expect(
      (
        await page.request.put("/api/profile", {
          data: {
            name,
            nickname: "reginadeipacchettinatalizi",
            badge: "gingerbread",
            badgeText,
          },
        })
      ).ok(),
    ).toBe(true);
    await page.goto(`/events/${event.id}?tab=competition`);
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const view of [
        "ornaments",
        "bells",
        "snowflakes",
        "stardust",
        "list",
      ]) {
        await page
          .getByLabel("Visualizzazione della classifica")
          .selectOption(view);
        const row = page
          .locator(
            view === "list"
              ? ".competition-ranks > li"
              : ".hourglass-board > li",
          )
          .first();
        const tag = row.locator(".holiday-nametag");
        await expect(tag).toBeVisible();
        const r = await row.boundingBox(),
          t = await tag.boundingBox();
        expect(t.x).toBeGreaterThanOrEqual(r.x);
        expect(t.x + t.width).toBeLessThanOrEqual(r.x + r.width + 1);
        expect(t.width).toBeGreaterThan(30);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        if (
          process.env.ARTIFACT_DIR &&
          badgeText === "name" &&
          width === 320 &&
          view === "ornaments"
        ) {
          mkdirSync(process.env.ARTIFACT_DIR, { recursive: true });
          await page
            .locator(".competition-standings")
            .screenshot({
              path: join(
                process.env.ARTIFACT_DIR,
                "classifica-targhetta-mobile.png",
              ),
            });
        }
      }
    }
  }
});
