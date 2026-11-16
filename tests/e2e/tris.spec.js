import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

async function login(request, email, name) {
  const requested = await request.post("/api/auth/request", {
    data: { email, name },
  });
  expect(requested.ok(), await requested.text()).toBeTruthy();
  const { devCode } = await requested.json();
  const verified = await request.post("/api/auth/verify", {
    data: { email, code: devCode },
  });
  expect(verified.ok(), await verified.text()).toBeTruthy();
  return (await request.get("/api/me").then((response) => response.json()))
    .user;
}

test("due amici condividono il tris e l’allenamento usa un avversario computer senza punti", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page.request, "admin@example.test", "Ada Tris");
  const date = (days) => new Date(Date.now() + days * 86_400_000).toISOString();
  const created = await page.request.post("/api/events", {
    data: {
      name: "Tris tra amici · QA",
      description: "Solo dati fittizi.",
      budget: 20,
      closeAt: date(1),
      drawAt: date(2),
      giftAt: date(3),
      organizerParticipates: true,
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const { event } = await created.json();
  const email = `tris-${Date.now()}@example.test`;
  const account = await page.request.post(`/api/events/${event.id}/accounts`, {
    data: { name: "Bea Neve", email },
  });
  expect(account.ok(), await account.text()).toBeTruthy();
  const partnerContext = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  try {
    const partner = await login(partnerContext.request, email, "Bea Neve");
    const otherPage = await partnerContext.newPage();
    otherPage.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/sfide?event=${event.id}`);
    await otherPage.goto(`/sfide?event=${event.id}`);
    const panel = page.getByRole("region", {
      name: "Tris sulla neve con il gruppo",
    });
    const otherPanel = otherPage.getByRole("region", {
      name: "Tris sulla neve con il gruppo",
    });
    await panel
      .getByLabel("Chi inviti a giocare a tris?")
      .selectOption(partner.id);
    await panel
      .getByRole("button", { name: "Invita a tris", exact: true })
      .click();
    await expect(
      panel.getByRole("heading", { name: "Tris con Bea Neve" }),
    ).toBeVisible();
    await otherPanel
      .getByRole("button", { name: "Aggiorna le partite" })
      .click();
    await expect(otherPanel.locator(".snow-tris-cell")).toHaveCount(9);
    await expect(otherPanel.locator(".snow-tris-cell:enabled")).toHaveCount(0);
    for (const [actor, observer, position, mark] of [
      [panel, otherPanel, 0, "X"],
      [otherPanel, panel, 3, "O"],
      [panel, otherPanel, 1, "X"],
      [otherPanel, panel, 4, "O"],
      [panel, otherPanel, 2, "X"],
    ]) {
      const square = actor.locator(".snow-tris-cell").nth(position);
      await expect(square).toBeEnabled();
      await square.focus();
      await square.press("Enter");
      await expect(square).toHaveAttribute(
        "aria-label",
        new RegExp(mark === "X" ? "impronta X" : "pallina O"),
      );
      await observer
        .getByRole("button", { name: "Aggiorna le partite" })
        .click();
      await expect(
        observer.locator(".snow-tris-cell").nth(position),
      ).toHaveAttribute(
        "aria-label",
        new RegExp(mark === "X" ? "impronta X" : "pallina O"),
      );
    }
    await expect(panel.locator(".snow-tris-status")).toHaveText(
      "Hai fatto tris!",
    );
    await expect(otherPanel.locator(".snow-tris-status")).toContainText(
      "Ha fatto tris",
    );
    await expect(
      panel.locator(".snow-tris-cell[data-winning=true]"),
    ).toHaveCount(3);
    const scores = await page.request
      .get(`/api/competition/${event.id}`)
      .then((response) => response.json());
    expect(scores.games.map((game) => game.id)).not.toContain("tris");
    expect(scores.leaderboard.every((row) => row.gamePoints === 0)).toBe(true);

    await otherPage.goto("/giochi");
    await otherPage
      .getByRole("article", { name: "Tris sulla neve", exact: true })
      .getByRole("button", { name: "Tris sulla neve", exact: true })
      .click();
    const practice = otherPage.getByRole("region", {
      name: "Allenamento: Tris sulla neve",
    });
    await expect(practice.locator(".snow-tris-cell")).toHaveCount(9);
    for (let move = 0; move < 5; move++) {
      const cells = practice.locator(".snow-tris-cell:enabled");
      if ((await cells.count()) === 0) break;
      const before = await practice.locator(".snow-tris-piece").count();
      await cells.first().click();
      await expect(practice).toHaveAttribute("aria-busy", "false");
      await expect
        .poll(() => practice.locator(".snow-tris-piece").count())
        .toBeGreaterThan(before);
    }
    await expect(practice).toContainText("Partita conclusa.");
    await expect(practice.locator(".snow-tris-cell:enabled")).toHaveCount(0);
    await expect(practice.locator(".snow-tris-status")).toContainText(
      /tris|Pareggio/,
    );
    await expect(practice.locator(".snow-tris-piece")).not.toHaveCount(0);
    expect(
      (
        await page.request
          .get(`/api/competition/${event.id}`)
          .then((response) => response.json())
      ).leaderboard.every((row) => row.gamePoints === 0),
    ).toBe(true);
    expect(
      await otherPage.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await otherPage.setViewportSize({ width: 320, height: 844 });
    expect(
      await otherPage.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    const squareSize = await practice
      .locator(".snow-tris-cell")
      .first()
      .boundingBox();
    expect(squareSize.width).toBeGreaterThanOrEqual(44);
    expect(squareSize.height).toBeGreaterThanOrEqual(44);
    expect(errors).toEqual([]);
    if (process.env.ARTIFACT_DIR) {
      mkdirSync(process.env.ARTIFACT_DIR, { recursive: true });
      await panel.screenshot({
        path: join(process.env.ARTIFACT_DIR, "tris-amici-mobile.png"),
      });
      await practice.screenshot({
        path: join(process.env.ARTIFACT_DIR, "tris-computer-mobile.png"),
      });
    }
  } finally {
    await partnerContext.close();
  }
});
