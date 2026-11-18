import { test, expect } from "@playwright/test";

test.use({
  reducedMotion: "reduce",
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

async function openGames(page) {
  const email = `curling-${Date.now()}@example.test`;
  const auth = await page.request
    .post("/api/auth/request", { data: { email, name: "Giocatore Curling" } })
    .then((r) => r.json());
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: auth.devCode },
      })
    ).ok(),
  ).toBe(true);
  const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
  const response = await page.request.post("/api/events", {
    data: {
      name: "Curling locale QA",
      budget: 20,
      organizerParticipates: true,
      closeAt: future(2),
      drawAt: future(3),
      giftAt: future(8),
    },
  });
  expect(response.ok()).toBe(true);
  const { event } = await response.json();
  await page.goto("/giochi");
  return event.id;
}

test("curling contro il computer: mira, sei tiri e partecipazione al ritratto senza classifica", async ({
  page,
}) => {
  const errors = [];
  const practiceRequests = [];
  const activityRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\/api\/practice\/curling/.test(request.url()))
      practiceRequests.push(request.url());
    if (/\/api\/profile\/activity$/.test(request.url()))
      activityRequests.push(request.postDataJSON());
  });
  const eventId = await openGames(page);
  const standings = () =>
    page.request
      .get(`/api/competition/${eventId}`)
      .then((r) => r.json())
      .then((r) =>
        r.games.map(({ id, attempts, best }) => ({ id, attempts, best })),
      );
  const before = await standings();
  await page
    .getByRole("button", { name: "Curling dei regali", exact: true })
    .click();
  const game = page.getByRole("region", { name: "Curling dei regali" });
  await expect(game).toBeVisible();
  await expect(game.locator("[data-turn]")).toContainText("Tu");
  await expect(game.getByRole("combobox")).toHaveCount(0);
  await game.locator("canvas").focus();
  await game.locator("canvas").press("ArrowRight");
  await expect(game.locator("[data-angle-out]")).toHaveText("3°");
  await game.locator("canvas").press("Escape");
  await expect(game.locator("[data-angle-out]")).toHaveText("0°");
  await expect(game).toHaveAttribute("data-shots", "0");
  expect(activityRequests).toEqual([]);
  for (let shot = 2; shot <= 6; shot += 2) {
    await game.getByRole("button", { name: "Lancia con questa mira" }).click();
    await expect(game).toHaveAttribute("data-shots", String(shot));
  }
  await expect(
    game.getByText(
      "Il tuo ritratto tiene conto della partecipazione al curling. Nessun punto in classifica.",
    ),
  ).toBeVisible();
  expect(activityRequests).toEqual([{ game: "curling" }]);
  const profile = await page.request.get("/api/profile").then((r) => r.json());
  expect(profile.context.activity.games).toContainEqual({
    game: "curling",
    count: 1,
    averageResult: null,
    selfReported: true,
  });
  await expect(
    game.getByRole("button", { name: "Lancia con questa mira" }),
  ).toBeDisabled();
  expect(Number(await game.getAttribute("data-contacts"))).toBeGreaterThan(0);
  await game.getByRole("button", { name: "Rivincita" }).click();
  await expect(game).toHaveAttribute("data-shots", "0");
  await expect(game.locator("[data-turn]")).toContainText("Computer");
  await game
    .getByText("Gioca da tastiera · regola la mira", { exact: true })
    .click();
  await expect(game).toHaveAttribute("data-shots", "1");
  await expect(game.locator("[data-turn]")).toContainText("Tu");
  await game.getByRole("button", { name: "Lancia con questa mira" }).click();
  await expect(game).toHaveAttribute("data-shots", "3");
  await expect(game.locator("[data-score]")).toContainText("Computer");
  await game.getByRole("button", { name: "Torna ai giochi" }).click();
  await expect(game).toHaveCount(0);
  await page
    .getByRole("button", { name: "Curling dei regali", exact: true })
    .click();
  await expect(game).toHaveAttribute("data-shots", "0");
  expect(await standings()).toEqual(before);
  expect(practiceRequests).toEqual([]);
  expect(activityRequests).toEqual([{ game: "curling" }]);
  expect(errors).toEqual([]);
  for (const width of [320, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});

test("curling: annulla il trascinamento e interrompe la simulazione uscendo o riavviando", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors = [];
  const activityRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\/api\/profile\/activity$/.test(request.url()))
      activityRequests.push(request.url());
  });
  await openGames(page);
  const open = () =>
    page
      .getByRole("button", { name: "Curling dei regali", exact: true })
      .click();
  await open();
  const game = page.getByRole("region", { name: "Curling dei regali" });
  const handle = game.locator("[data-handle]");
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 - 15,
    box.y + box.height / 2 + 25,
  );
  await handle.press("Escape");
  await page.mouse.up();
  await expect(game).toHaveAttribute("data-shots", "0");
  await expect(game.locator("[data-status]")).toContainText("Mira annullata");
  await game.getByRole("button", { name: "Lancia con questa mira" }).click();
  await expect(game).toHaveAttribute("data-busy", "true");
  await game.getByRole("button", { name: "Rivincita" }).click();
  await expect(game).toHaveAttribute("data-shots", "0");
  await expect(game).toHaveAttribute("data-busy", "false");
  await game.getByRole("button", { name: "Lancia con questa mira" }).click();
  await game.getByRole("button", { name: "Torna ai giochi" }).click();
  await open();
  await expect(game).toHaveAttribute("data-shots", "0");
  await expect(game).toHaveAttribute("data-busy", "false");
  await page.waitForTimeout(500);
  await expect(game).toHaveAttribute("data-shots", "0");
  expect(errors).toEqual([]);
  expect(activityRequests).toEqual([]);
});

test("curling touch: annullamento, lancio e scorrimento della pagina a 320px", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await openGames(page);
  await page
    .getByRole("button", { name: "Curling dei regali", exact: true })
    .tap();
  const game = page.getByRole("region", { name: "Curling dei regali" });
  const handle = game.locator("[data-handle]");
  await handle.scrollIntoViewIfNeeded();
  const cdp = await page.context().newCDPSession(page);
  async function drag(cancel) {
    const r = await handle.boundingBox();
    const x = r.x + r.width / 2,
      y = r.y + r.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, id: 1 }],
    });
    for (let i = 1; i <= 8; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x - i, y: y + 3 * i, id: 1 }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: cancel ? "touchCancel" : "touchEnd",
      touchPoints: [],
    });
  }
  await drag(true);
  await expect(game).toHaveAttribute("data-shots", "0");
  await expect(game.locator("[data-status]")).toContainText("Mira annullata");
  await drag(false);
  await expect(game).toHaveAttribute("data-shots", "2");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await game.screenshot({ path: testInfo.outputPath("curling-touch-320.png") });
  await page.evaluate(() => scrollTo(0, 100));
  const before = await page.evaluate(() => scrollY);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 5, y: 700, id: 1 }],
  });
  for (let i = 1; i <= 10; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 5, y: 700 - i * 25, id: 1 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
});
