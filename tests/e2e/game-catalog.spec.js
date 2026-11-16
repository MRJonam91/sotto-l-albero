import { test, expect } from "@playwright/test";

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
