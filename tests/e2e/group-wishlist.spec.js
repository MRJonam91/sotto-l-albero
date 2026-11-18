import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function signIn(client, email, name) {
  const { devCode } = await client
    .post("/api/auth/request", { data: { email, name } })
    .then((r) => r.json());
  expect(
    (
      await client.post("/api/auth/verify", { data: { email, code: devCode } })
    ).ok(),
  ).toBe(true);
}

test.use({
  viewport: { width: 320, height: 840 },
  hasTouch: true,
  reducedMotion: "reduce",
});

test("ritratti del gruppo e prodotti di negozi diversi, con ritiro esplicito", async ({
  page,
  browser,
  baseURL,
}) => {
  const unique = Date.now();
  await signIn(page.request, `group-owner-${unique}@example.test`, "Ada");
  const future = (days) =>
    new Date(Date.now() + days * 86_400_000).toISOString();
  const { event } = await page.request
    .post("/api/events", {
      data: {
        name: "Il Natale dei ritratti",
        organizerParticipates: true,
        budget: 20,
        closeAt: future(1),
        drawAt: future(2),
        giftAt: future(10),
      },
    })
    .then((r) => r.json());
  const friend = await browser.newContext({ baseURL });
  try {
    await signIn(
      friend.request,
      `group-friend-${unique}@example.test`,
      "Bruno",
    );
    const own = await page.request
      .get(`/api/events/${event.id}`)
      .then((r) => r.json());
    expect(
      (
        await friend.request.post(`/api/events/${event.id}/join`, {
          data: { token: own.event.inviteToken },
        })
      ).ok(),
    ).toBe(true);
    const pending = await page.request
      .get(`/api/events/${event.id}`)
      .then((r) => r.json());
    const member = pending.members.find((m) => m.name === "Bruno");
    expect(
      (
        await page.request.post(
          `/api/events/${event.id}/members/${member.id}`,
          { data: { status: "approved" } },
        )
      ).ok(),
    ).toBe(true);
    await friend.request.put("/api/profile", {
      data: {
        holidayProfile: {
          quote: "Mi piacciono le sorprese",
          portraitApproved: true,
        },
      },
    });
    await page.goto(`/events/${event.id}`);
    await page
      .getByRole("button", { name: "Vedi il ritratto di Bruno" })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Spirito di Natale · Bruno",
    });
    await expect(dialog.locator(".portrait-taste-row")).toHaveCount(5);
    await expect(dialog.locator(".character-comparison-item")).toHaveCount(3);
    await expect(
      dialog.locator(".character-comparison-head > span").first(),
    ).toContainText("%");
    await page.keyboard.press("Escape");

    await page.goto(`/events/${event.id}?tab=wishlist`);
    const shop = page.getByRole("region", { name: "Cerca un prodotto" });
    await shop.getByLabel("Cosa cerchi?").fill("Tazza blu");
    await shop.getByLabel("Dove cercare").selectOption("local");
    await expect(shop.getByRole("button", { name: "Cerca ↗" })).toBeDisabled();
    await shop.getByLabel("Città dello scambio").fill("Torino");
    await expect(shop.getByRole("button", { name: "Cerca ↗" })).toBeEnabled();
    await shop.getByLabel("Dove cercare").selectOption("etsy");
    await shop
      .getByText("Aggiungi un prodotto con nome e link", { exact: true })
      .click();
    await shop.getByLabel("Nome del prodotto").fill("Una tazza artigianale");
    await shop
      .getByLabel("Link del prodotto o del negozio")
      .fill("https://www.etsy.com/it/search?q=tazza");
    await shop.getByRole("button", { name: "Aggiungi alla lettera" }).click();
    const wish = page.locator(".wish-editor");
    await wish
      .getByText("Ritiro in negozio (facoltativo)", { exact: true })
      .click();
    await wish
      .getByLabel("Questo desiderio richiede il ritiro in negozio")
      .check();
    await wish.getByLabel("Città del ritiro").fill("Torino");
    await page
      .getByRole("button", { name: "Salva la lettera", exact: true })
      .click();
    const saved = await page.request
      .get(`/api/events/${event.id}`)
      .then((r) => r.json());
    expect(saved.wishlist[0]).toMatchObject({
      title: "Una tazza artigianale",
      fulfillment: "pickup",
      pickupCity: "Torino",
    });
    expect(saved.wishlist[0].url).not.toContain("tag=");
    const a11y = await new AxeBuilder({ page })
      .include(".wish-shopping")
      .include(".wish-editor")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(a11y.violations).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
  } finally {
    await friend.close();
  }
});
