import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test("Giochi mostra tutto il catalogo e l’allenamento non consuma tentativi a punti", async ({
  page,
}) => {
  const email = `catalog-${Date.now()}@example.test`;
  const auth = await page.request
    .post("/api/auth/request", { data: { email, name: "Nina Catalogo" } })
    .then((r) => r.json());
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: auth.devCode },
      })
    ).ok(),
  ).toBe(true);
  const future = (days) =>
    new Date(Date.now() + days * 86_400_000).toISOString();
  const created = await page.request.post("/api/events", {
    data: {
      name: "Gruppo catalogo",
      budget: 20,
      organizerParticipates: true,
      closeAt: future(2),
      drawAt: future(3),
      giftAt: future(8),
    },
  });
  expect(created.ok()).toBe(true);
  const { event } = await created.json();
  const before = await page.request
    .get(`/api/competition/${event.id}`)
    .then((r) => r.json());
  await page.goto("/giochi");
  for (const name of [
    "Quiz di Natale",
    "Memory di Natale",
    "Indovina il film",
    "Pacchi smarriti",
    "Sacco della slitta",
    "La cartolina scomparsa",
    "Prendi i pacchi",
    "Tris sulla neve",
  ]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Pacchi smarriti", exact: true })
    .tap();
  await expect(page.locator(".practice-challenge")).toContainText(
    "Pacchi smarriti",
  );
  await expect(page.locator(".practice-challenge form")).toBeVisible();
  const after = await page.request
    .get(`/api/competition/${event.id}`)
    .then((r) => r.json());
  expect(
    after.games.map(({ id, attempts, best }) => ({ id, attempts, best })),
  ).toEqual(
    before.games.map(({ id, attempts, best }) => ({ id, attempts, best })),
  );
  await page
    .getByRole("button", {
      name: "Gioca per punti: Pacchi smarriti",
      exact: true,
    })
    .tap();
  await expect(page).toHaveURL(/\/sfide\?event=/);
  await expect(
    page.getByRole("heading", { name: "Classifica di gruppo" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("Indovina il film: icone, 4 opzioni con lettere, curiosità, accessibilità e prova a punti", async ({
  page,
}) => {
  const email = `film-e2e-${Date.now()}@example.test`;
  const auth = await page.request
    .post("/api/auth/request", { data: { email, name: "Leo Cinema" } })
    .then((r) => r.json());
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: auth.devCode },
      })
    ).ok(),
  ).toBe(true);
  const future = (days) =>
    new Date(Date.now() + days * 86_400_000).toISOString();
  const created = await page.request.post("/api/events", {
    data: {
      name: "Cinema di Natale",
      budget: 25,
      organizerParticipates: true,
      closeAt: future(2),
      drawAt: future(3),
      giftAt: future(8),
    },
  });
  expect(created.ok()).toBe(true);

  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/giochi");
  await page
    .getByRole("button", { name: "Indovina il film", exact: true })
    .tap();

  const game = page.locator(".holiday-game");
  await expect(game.getByText("Film 1 di 10")).toBeVisible();
  await expect(game.locator(".movie-badge")).toHaveText("Film #1");
  await expect(game.locator(".movie-icon-tile")).toHaveCount(5);
  await expect(game.locator(".movie-option")).toHaveCount(4);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);

  const practiceAxe = await new AxeBuilder({ page })
    .include(".holiday-game")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    practiceAxe.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    })),
  ).toEqual([]);

  await game.locator(".movie-option").first().click();
  await expect(game.locator(".movie-trivia-box")).toBeVisible();
  await expect(game.locator(".movie-option.is-correct")).toHaveCount(1);
  await game.getByRole("button", { name: "Prossimo film" }).click();
  await expect(game.locator(".movie-badge")).toHaveText("Film #2");

  await page
    .getByRole("button", {
      name: "Gioca per punti: Indovina il film",
      exact: true,
    })
    .tap();
  await expect(page).toHaveURL(/\/sfide\?event=/);
  await page
    .getByRole("button", { name: "Gioca: Indovina il film", exact: true })
    .click();
  const play = page.locator(".competition-play");
  await expect(play.getByText("Film 1 di 10")).toBeVisible();
  await expect(play.locator(".movie-badge")).toHaveText("Film #1");
  await expect(play.locator(".movie-icon-tile")).toHaveCount(5);
  await expect(play.locator(".movie-option")).toHaveCount(4);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);

  const rankedAxe = await new AxeBuilder({ page })
    .include(".competition-play")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    rankedAxe.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    })),
  ).toEqual([]);
});
