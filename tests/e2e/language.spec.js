import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("il cambio lingua conserva la bozza, i testi privati e la preferenza dell’account", async ({
  page,
}) => {
  const email = `languages-${Date.now()}@example.test`;
  const request = await page.request.post("/api/auth/request", {
    data: { email, name: "Chiudi" },
  });
  const { devCode } = await request.json();
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: devCode, locale: "es" },
      })
    ).ok(),
  ).toBe(true);
  const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
  const { event } = await page.request
    .post("/api/events", {
      data: {
        name: "Iscrizioni aperte",
        budget: 20,
        organizerParticipates: true,
        closeAt: future(1),
        drawAt: future(2),
        giftAt: future(7),
      },
    })
    .then((r) => r.json());
  await page.route("**/api/gifts?**", (route) =>
    route.fulfill({ json: { products: [], hasMore: false } }),
  );
  await page.goto(`/events/${event.id}?tab=wishlist`);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  const language = page.locator(".site-header select");
  const draft = page.locator('[name="wish-title-0"]');
  if (!(await draft.count()))
    await page.getByRole("button", { name: /añad.*deseo/i }).click();
  await draft.fill("Chiudi — un pensiero di Ada");
  for (const [code, width] of [
    ["fr", 320],
    ["de", 390],
    ["pt", 768],
    ["en", 1024],
    ["it", 1440],
    ["es", 430],
  ]) {
    await page.setViewportSize({ width, height: 850 });
    await language.selectOption(code);
    await expect(page.locator("html")).toHaveAttribute("lang", code);
    await expect(draft).toHaveValue("Chiudi — un pensiero di Ada");
    await expect(
      page.getByRole("heading", { name: "Iscrizioni aperte", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
  expect((await (await page.request.get("/api/me")).json()).user.locale).toBe(
    "es",
  );
  await page
    .getByRole("button", { name: /guardar.*(carta|lista|deseos)/i })
    .click();
  await page.reload();
  await expect(draft).toHaveValue("Chiudi — un pensiero di Ada");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  const a11y = await new AxeBuilder({ page })
    .include(".site-header")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
});
