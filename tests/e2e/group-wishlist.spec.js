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

test("ritratti del gruppo, prodotti nel budget, ricerca Amazon e ritiro esplicito", async ({
  page,
  browser,
  baseURL,
}) => {
  const unique = Date.now();
  const catalogRequests = [];
  const products = [
    {
      id: "qa-cup",
      title: "Tazza artigianale blu",
      merchant: "Bottega QA",
      price: 12.5,
      image: "/hero.webp",
      url: "https://www.etsy.com/listing/123456789/tazza-blu",
      category: "home",
    },
    {
      id: "qa-puzzle",
      title: "Puzzle di Natale",
      merchant: "Giochi QA",
      price: 8,
      image: "/hero.webp",
      url: "https://www.etsy.com/listing/123456790/puzzle-natale",
      category: "games",
    },
  ];
  await page.route("**/api/gifts?*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    catalogRequests.push(Object.fromEntries(params));
    await route.fulfill({
      json: {
        products: products.filter(
          (product) =>
            product.price <= Number(params.get("max")) &&
            product.price >= Number(params.get("min")) &&
            (params.get("category") === "all" ||
              params.get("category") === product.category),
        ),
        cursor: "",
        hasMore: false,
        checkedAt: new Date().toISOString(),
      },
    });
  });
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
    const catalog = page.getByRole("region", {
      name: "Quale regalo ti piacerebbe?",
    });
    await expect(catalog.locator(".gift-product")).toHaveCount(2);
    await expect(catalog.locator(".gift-budget")).toContainText("20");
    await expect(
      catalog.getByRole("heading", { name: "Tazza artigianale blu" }),
    ).toBeVisible();
    await expect(catalog.locator(".gift-product-price").first()).toContainText(
      "12,5",
    );
    expect(catalogRequests[0]).toMatchObject({
      eventId: event.id,
      category: "all",
      min: "0",
      max: "20",
    });
    const external = page.locator("details.wish-shopping");
    await expect(external).not.toHaveAttribute("open", "");
    await expect(external.getByLabel("Cosa cerchi?")).not.toBeVisible();
    const amazon = catalog.getByRole("link", { name: "Cerca su Amazon.it" });
    await expect(amazon).toHaveAttribute(
      "href",
      "https://www.amazon.it/s?k=idee+regalo",
    );
    const localShops = catalog.getByRole("button", {
      name: "Cerca negozi in città",
    });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 840 });
      await amazon.scrollIntoViewIfNeeded();
      await expect(localShops).toBeInViewport();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    await page.setViewportSize({ width: 320, height: 840 });
    await catalog
      .getByText("Cerchi qualcosa di preciso?", { exact: true })
      .click();
    await catalog.getByLabel("Cerca nel catalogo").fill("Tazza & blu");
    await expect(amazon).toHaveAttribute(
      "href",
      "https://www.amazon.it/s?k=Tazza+%26+blu",
    );
    await catalog
      .getByRole("button", { name: "Sotto i 10 €", exact: true })
      .tap();
    await expect(catalog.locator(".gift-product")).toHaveCount(1);
    await expect(
      catalog.getByRole("heading", { name: "Puzzle di Natale" }),
    ).toBeVisible();
    await catalog.getByRole("button", { name: "Giochi", exact: true }).tap();
    await expect(
      catalog.getByRole("button", { name: "Giochi", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => catalogRequests.at(-1))
      .toMatchObject({ category: "games", max: "10" });
    await catalog
      .getByRole("button", {
        name: "Aggiungi Puzzle di Natale alla lettera",
        exact: true,
      })
      .tap();
    await expect(
      catalog.getByRole("button", {
        name: "Puzzle di Natale già nella lettera",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(page.locator(".wish-editor")).toHaveCount(1);
    await expect(amazon).toHaveAttribute(
      "href",
      "https://www.amazon.it/s?k=Giochi",
    );
    await localShops.tap();
    await expect(external.getByLabel("Cosa cerchi?")).toHaveValue("Giochi");
    await expect(external.getByLabel("Cosa cerchi?")).toBeFocused();
    await expect(external.getByLabel("Dove cercare")).toHaveValue("local");
    const shop = external;
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
    const wish = page.locator(".wish-editor").last();
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
    expect(saved.wishlist).toHaveLength(2);
    expect(saved.wishlist[0]).toMatchObject({
      title: "Puzzle di Natale",
      url: products[1].url,
    });
    expect(saved.wishlist[1]).toMatchObject({
      title: "Una tazza artigianale",
      fulfillment: "pickup",
      pickupCity: "Torino",
    });
    expect(saved.wishlist[1].url).not.toContain("tag=");
    const a11y = await new AxeBuilder({ page })
      .include(".wish-shopping")
      .include(".gift-browser")
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
