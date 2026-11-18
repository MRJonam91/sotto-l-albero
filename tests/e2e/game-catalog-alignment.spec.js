import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

const names = [
  "Quiz di Natale",
  "Memory di Natale",
  "Indovina il film",
  "Pacchi smarriti",
  "Sacco della slitta",
  "La cartolina scomparsa",
  "Prendi i pacchi",
  "Tris sulla neve",
  "Curling dei regali",
];

async function setup(page, suffix = "") {
  const email = `catalog-align-${Date.now()}${suffix}@example.test`;
  const auth = await page.request
    .post("/api/auth/request", { data: { email, name: "Ada Catalogo" } })
    .then((r) => r.json());
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: auth.devCode },
      })
    ).ok(),
  ).toBe(true);
  const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
  const create = () =>
    page.request
      .post("/api/events", {
        data: {
          name: "Catalogo condiviso",
          budget: 20,
          organizerParticipates: true,
          closeAt: future(2),
          drawAt: future(3),
          giftAt: future(8),
        },
      })
      .then((r) => r.json())
      .then((r) => r.event);
  return { event: await create(), create };
}

test("le due viste mostrano gli stessi nove giochi e le azioni computer aprono il gioco scelto", async ({
  page,
}) => {
  const { event } = await setup(page);
  await page.goto("/giochi");
  await expect(page.locator(".game-catalog-item")).toHaveCount(9);
  const standalone = await page
    .locator(".game-catalog-item")
    .evaluateAll((cards) =>
      cards.map((card) => ({
        name: card.getAttribute("aria-label"),
        description: card.querySelector("p").textContent,
      })),
    );
  expect(standalone.map(({ name }) => name)).toEqual(names);
  await page.goto(`/sfide?event=${event.id}`);
  await expect(page.locator(".competition-game")).toHaveCount(9);
  const group = await page.locator(".competition-game").evaluateAll((cards) =>
    cards.map((card) => ({
      name: card.querySelector("h4").textContent,
      description: card.querySelector(".game-description").textContent,
    })),
  );
  expect(group).toEqual(standalone);
  for (const id of ["tris", "curling"]) {
    const card = page.locator(`#game-${id}`);
    await expect(card).not.toContainText(
      /Fino a|Miglior risultato|tentativi nuovi/,
    );
    await expect(
      card.getByRole("button", { name: /Sfida a punti:|Riprendi la sfida:/ }),
    ).toHaveCount(0);
  }
  await page
    .locator("#game-curling")
    .getByRole("link", { name: "Contro il computer: Curling dei regali" })
    .click();
  await expect(page).toHaveURL(/\/giochi\?game=curling/);
  await expect(
    page.getByRole("region", { name: "Curling dei regali" }),
  ).toBeVisible();
  await expect(page.locator(".curling-game [data-turn]")).toContainText("Tu");
  await page.goto(`/sfide?event=${event.id}`);
  await page
    .locator("#game-tris")
    .getByRole("link", { name: "Contro il computer: Tris sulla neve" })
    .click();
  await expect(page).toHaveURL(/\/giochi\?game=tris/);
  await expect(
    page.getByRole("region", { name: "Allenamento: Tris sulla neve" }),
  ).toBeVisible();
  await page.goto("/giochi?game=non-esiste");
  await expect(page.locator(".curling-game,.practice-challenge")).toHaveCount(
    0,
  );
});

test("la scelta del gioco e della modalità amico sopravvive alla selezione del gruppo", async ({
  page,
}) => {
  const { create } = await setup(page, "-multi");
  await create();
  await page.goto("/giochi");
  await page
    .getByRole("article", { name: "Tris sulla neve", exact: true })
    .getByRole("button", { name: "Sfida un amico a Tris sulla neve" })
    .click();
  await expect(page).toHaveURL(/\/sfide\?game=tris&mode=friends/);
  await expect(page.locator(".event-shortcut-list button")).toHaveCount(2);
  await page.locator(".event-shortcut-list button").first().click();
  await expect(page).toHaveURL(/game=tris/);
  await expect(page).toHaveURL(/mode=friends/);
  await expect(page.locator("#friends-tris")).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Tris sulla neve con il gruppo" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("un’edizione archiviata mostra i risultati salvati senza azioni per iniziare nuove partite", async ({
  page,
}) => {
  const { event } = await setup(page, "-archived");
  let result = await page.request
    .post(`/api/competition/${event.id}/start`, { data: { game: "quiz" } })
    .then((r) => r.json());
  for (let index = 0; index < 10 && !result.attempt.done; index++)
    result = await page.request
      .post(`/api/competition/${event.id}/action`, {
        data: {
          attemptId: result.attempt.id,
          revision: result.attempt.revision,
          choice: 0,
        },
      })
      .then((r) => r.json());
  expect(result.attempt.done).toBe(true);
  expect(
    (
      await page.request.post(`/api/events/${event.id}/archive`, { data: {} })
    ).ok(),
  ).toBe(true);
  await page.goto(`/sfide?event=${event.id}`);
  await expect(
    page.getByRole("heading", { name: "Risultati delle sfide" }),
  ).toBeVisible();
  await expect(page.locator(".competition-game")).toHaveCount(1);
  await expect(page.locator("#game-quiz")).toContainText("Quiz di Natale");
  await expect(page.locator(".competition-games a")).toHaveCount(0);
  await expect(
    page.locator(".competition-games").getByRole("button", {
      name: /Sfida a punti:|Riprendi la sfida:|Gioca la nuova prova:|Con un amico:/,
    }),
  ).toHaveCount(0);
});
