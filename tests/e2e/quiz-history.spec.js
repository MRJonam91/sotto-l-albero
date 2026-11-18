import { expect, request, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function signIn(client, email, name) {
  const started = await client.post("/api/auth/request", {
    data: { email, name, phone: "+393200000000" },
  });
  expect(started.ok()).toBeTruthy();
  const { devCode } = await started.json();
  const finished = await client.post("/api/auth/verify", {
    data: { email, code: devCode },
  });
  expect(finished.ok()).toBeTruthy();
  return (await finished.json()).user;
}

async function openCompetition(page, eventId) {
  await page.goto(`/events/${eventId}`);
  await page.getByRole("button", { name: "Sfide e classifica" }).click();
  await expect(
    page.getByRole("heading", { name: "Classifica di gruppo" }),
  ).toBeVisible();
}

test("Quiz e film: risultati riapribili dopo reload e archivio, con ritorno alla stessa scheda", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(100_000);
  const organizer = await request.newContext({ baseURL });
  try {
    await signIn(organizer, "admin@example.test", "Organizzatore QA");
    const user = await signIn(
      page.request,
      `history-${Date.now()}@example.test`,
      "Anna Cronologia",
    );
    const future = (days) =>
      new Date(Date.now() + days * 86_400_000).toISOString();
    const created = await organizer.post("/api/events", {
      data: {
        name: "Risultati da rileggere",
        budget: 20,
        closeAt: future(2),
        drawAt: future(4),
        giftAt: future(6),
      },
    });
    expect(created.ok()).toBeTruthy();
    const { event } = await created.json();
    const eventPath = `/api/events/${event.id}`;
    expect(
      (
        await page.request.post(`${eventPath}/join`, {
          data: { token: event.inviteToken },
        })
      ).ok(),
    ).toBeTruthy();
    const { members } = await (await organizer.get(eventPath)).json();
    const member = members.find((item) => item.userId === user.id);
    expect(
      (
        await organizer.post(`${eventPath}/members/${member.id}`, {
          data: { status: "approved" },
        })
      ).ok(),
    ).toBeTruthy();
    const path = `/api/competition/${event.id}`;
    const completed = [];
    for (const game of ["quiz", "film"]) {
      let { attempt } = await (
        await page.request.post(`${path}/start`, { data: { game } })
      ).json();
      while (!attempt.done) {
        const response = await page.request.post(`${path}/action`, {
          data: {
            attemptId: attempt.id,
            revision: attempt.revision,
            choice: 0,
          },
        });
        expect(response.ok()).toBeTruthy();
        ({ attempt } = await response.json());
      }
      completed.push(attempt);
    }
    const originalBoard = await (await page.request.get(path)).json();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 844 });
    await openCompetition(page, event.id);
    for (let pass = 0; pass < 2; pass++) {
      for (const attempt of completed) {
        const name =
          attempt.game === "quiz" ? "Quiz di Natale" : "Indovina il film";
        const card = page
          .locator(".competition-game")
          .filter({ has: page.getByRole("heading", { name, exact: true }) });
        const opener = card.getByRole("button", {
          name: `Vedi risposte: tentativo 1 di ${name}`,
        });
        await opener.click();
        const dialog = page.getByRole("dialog", { name: `Risultato: ${name}` });
        await expect(dialog).toBeVisible();
        await expect(dialog.locator(".quiz-review-card")).toHaveCount(
          attempt.total,
        );
        await expect(dialog).not.toContainText("una volta chiuso");
        for (const width of [320, 390, 430]) {
          await page.setViewportSize({ width, height: 844 });
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width);
          expect(
            await dialog.evaluate(
              (node) => node.scrollWidth <= node.clientWidth,
            ),
          ).toBe(true);
        }
        const a11y = await new AxeBuilder({ page })
          .include(".competition-play")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(a11y.violations).toEqual([]);
        await dialog.getByRole("button", { name: "Torna alle sfide" }).click();
        await expect(dialog).toHaveCount(0);
        await expect(opener).toBeFocused();
      }
      await page.reload();
      await page.getByRole("button", { name: "Sfide e classifica" }).click();
    }
    const afterReviews = await (await page.request.get(path)).json();
    expect(afterReviews.games).toEqual(originalBoard.games);
    expect(afterReviews.leaderboard).toEqual(originalBoard.leaderboard);
    expect(
      (await organizer.post(`${eventPath}/archive`, { data: {} })).ok(),
    ).toBeTruthy();
    await openCompetition(page, event.id);
    await expect(page.getByText(/Edizione .*Conclusa/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Sfida a punti:/ }),
    ).toHaveCount(0);
    await page
      .getByRole("button", {
        name: "Vedi risposte: tentativo 1 di Quiz di Natale",
      })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Risultato: Quiz di Natale" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: "Vedi risposte: tentativo 1 di Quiz di Natale",
      }),
    ).toBeFocused();
  } finally {
    await organizer.dispose();
  }
});
