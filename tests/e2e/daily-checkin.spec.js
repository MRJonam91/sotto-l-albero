import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function signIn(page, suffix) {
  const email = `daily-light-${suffix}-${Date.now()}@example.test`;
  const start = await page.request.post("/api/auth/request", {
    data: { email, name: "Ada Natale" },
  });
  const { devCode } = await start.json();
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: devCode },
      })
    ).ok(),
  ).toBe(true);
}

test("il giornaliero si può ignorare senza peggiorare il ritratto e senza riproporlo nello stesso giorno", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await signIn(page, "skip");
  const before = await page.request.get("/api/profile").then((r) => r.json());
  await page.goto("/");
  const strip = page.locator(".daily-checkin-strip");
  await expect(strip).toContainText("Come ti senti oggi?");
  await strip.getByRole("button", { name: "Non ora", exact: true }).click();
  await expect(strip).toHaveCount(0);
  const after = await page.request.get("/api/profile").then((r) => r.json());
  expect(after.portrait.characterMatches).toEqual(
    before.portrait.characterMatches,
  );
  await page.reload();
  await expect(strip).toHaveCount(0);
  await expect(page.locator(".daily-checkin-feedback")).toHaveCount(0);
});

test("oggi mi sento come è una sola scelta e conserva tutte le preferenze precedenti", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await signIn(page, "mood");
  expect(
    (
      await page.request.put("/api/profile", {
        data: {
          holidayProfile: {
            quote: "Un pensiero già salvato",
            answers: { soundtrack: "jazz_fireplace" },
            portraitApproved: false,
          },
        },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/");
  const strip = page.locator(".daily-checkin-strip");
  await expect(strip).toContainText("Come ti senti oggi?");
  await strip
    .getByRole("button", { name: "Scegli lo stato", exact: true })
    .click();
  const picker = page.getByRole("dialog", { name: "Oggi mi sento come…" });
  await expect(picker.getByRole("radio")).toHaveCount(8);
  await expect(picker.locator(".guided-step-pill")).toHaveCount(0);
  await picker.getByRole("radio", { name: /cioccolata/i }).check();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
  await picker
    .getByRole("button", { name: "Salva stato", exact: true })
    .click();
  await expect(picker).toHaveCount(0);
  await expect(strip).toHaveCount(0);
  const profile = await page.request.get("/api/profile").then((r) => r.json());
  expect(profile.holidayProfile.quote).toBe("Un pensiero già salvato");
  expect(profile.holidayProfile.answers.soundtrack).toBe("jazz_fireplace");
  expect(profile.holidayProfile.portraitApproved).toBe(false);
  expect(profile.holidayProfile.dailyMood).toMatchObject({
    id: "cocoa",
    date: profile.dailyCheckin.today,
  });
  await page.reload();
  await expect(strip).toHaveCount(0);
});
