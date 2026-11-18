import { expect, request, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { quizQuestions } from "../../shared/quizQuestions.js";

test.use({ hasTouch: true });

async function signIn(client, email, name) {
  const start = await client.post("/api/auth/request", {
    data: { email, name, phone: "+393200000000" },
  });
  expect(start.ok()).toBeTruthy();
  const { devCode } = await start.json();
  expect(devCode).toBeTruthy();
  const finish = await client.post("/api/auth/verify", {
    data: { email, code: devCode },
  });
  expect(finish.ok()).toBeTruthy();
  return (await finish.json()).user;
}

async function openCompetition(page, eventId) {
  await page.goto(`/events/${eventId}`);
  await page.getByRole("button", { name: "Sfide e classifica" }).click();
  await expect(
    page.getByRole("heading", { name: "Classifica di gruppo" }),
  ).toBeVisible();
}

test("Sfide aperte agli iscritti, duelli e bicchieri anche a zero punti", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(75_000);
  const organizer = await request.newContext({ baseURL });
  const friend = await request.newContext({ baseURL });
  const third = await request.newContext({ baseURL });
  let friendBrowser;
  try {
    const suffix = Date.now();
    await signIn(organizer, "admin@example.test", "Organizzatore QA");
    const future = (days) =>
      new Date(Date.now() + days * 86_400_000).toISOString();
    const created = await organizer.post("/api/events", {
      data: {
        name: `Bicchieri e sfide QA ${suffix}`,
        budget: 20,
        closeAt: future(2),
        drawAt: future(4),
        giftAt: future(6),
      },
    });
    expect(created.ok()).toBeTruthy();
    const { event } = await created.json();
    const eventPath = `/api/events/${event.id}`;
    const anna = await signIn(
      page.request,
      `sfide-anna-${suffix}@example.test`,
      "Anna Sfide",
    );
    const bruno = await signIn(
      friend,
      `sfide-bruno-${suffix}@example.test`,
      "Bruno Senza Partite",
    );
    const carla = await signIn(
      third,
      `sfide-carla-${suffix}@example.test`,
      "Carla Bicchiere Vuoto",
    );
    for (const client of [page.request, friend, third]) {
      const joined = await client.post(`${eventPath}/join`, {
        data: { token: event.inviteToken },
      });
      expect(joined.ok()).toBeTruthy();
    }
    const { members } = await (await organizer.get(eventPath)).json();
    for (const person of [anna, bruno, carla]) {
      const member = members.find((item) => item.userId === person.id);
      const approval = await organizer.post(
        `${eventPath}/members/${member.id}`,
        {
          data: { status: "approved" },
        },
      );
      expect(approval.ok()).toBeTruthy();
    }

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await openCompetition(page, event.id);
    const standings = page.locator(".competition-standings");
    await expect(standings.locator(".hourglass-art")).toHaveCount(3);
    await expect(standings.getByText("0 pt", { exact: true })).toHaveCount(3);
    const scrollRegion = page.getByRole("region", {
      name: "Clessidre della classifica",
    });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      expect(
        await scrollRegion.evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        ),
      ).toBe(true);
    }
    await expect(
      page.getByRole("button", { name: "Iscriviti alle sfide" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Sfida un amico" }),
    ).toBeVisible();
    const opponent = page.getByLabel("Chi vuoi sfidare?");
    await expect(
      opponent.locator("option", { hasText: "Carla Bicchiere Vuoto" }),
    ).toHaveCount(1);
    await opponent.selectOption(bruno.id);
    await page.getByRole("button", { name: "Lancia un duello" }).click();
    await expect(page.getByText("Duello lanciato.")).toBeVisible();
    await expect(
      page.getByText("Duello con Bruno Senza Partite"),
    ).toBeVisible();

    friendBrowser = await browser.newContext({
      baseURL,
      storageState: await friend.storageState(),
    });
    const receiver = await friendBrowser.newPage();
    await openCompetition(receiver, event.id);
    await expect(receiver.getByText("Hai ricevuto un invito.")).toBeVisible();
    await expect(
      receiver.getByRole("button", { name: "Gioca il duello" }),
    ).toBeVisible();

    for (let repeat = 0; repeat < 2; repeat++) {
      const claim = await page.request.post("/api/stamps", {
        data: { stamp: "star" },
      });
      expect(claim.ok()).toBeTruthy();
    }

    const submit = page.getByRole("button", { name: "Conferma la soluzione" });
    const directory = process.env.ARTIFACT_DIR;
    async function capture(name) {
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(320);
      if (!directory) return;
      mkdirSync(directory, { recursive: true });
      await page.locator(".competition-play").screenshot({
        path: join(directory, `${name}-320.png`),
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator(".competition-play").screenshot({
        path: join(directory, `${name}-desktop.png`),
      });
      await page.setViewportSize({ width: 320, height: 844 });
    }
    async function finish() {
      await submit.click();
      await expect(
        page.getByRole("heading", { name: "Partita conclusa" }),
      ).toBeVisible();
      await expect(page.locator(".competition-play")).toContainText(
        "100 punti",
      );
      await page.getByRole("button", { name: "Torna alle sfide" }).click();
    }

    await page.getByRole("button", { name: "Gioca: Pacchi smarriti" }).click();
    await expect(submit).toBeDisabled();
    await page.setViewportSize({ width: 320, height: 844 });
    await capture("pacchi-smarriti");
    for (const [person, parcel] of [
      ["Nina", "Biscotti"],
      ["Teo", "Lanterna"],
      ["Lea", "Tazza"],
      ["Omar", "Libro"],
      ["Ada", "Sciarpa"],
      ["Milo", "Puzzle"],
    ]) {
      await page
        .getByRole("button", { name: parcel, exact: true })
        .press("Enter");
      await page
        .getByRole("button", { name: `Posto di ${person}`, exact: true })
        .press("Enter");
    }
    await expect(
      page.getByRole("status").filter({ hasText: "6 di 6 pacchi assegnati" }),
    ).toBeVisible();
    await finish();

    await page
      .getByRole("button", { name: "Gioca: Sacco della slitta" })
      .click();
    await page.getByRole("button", { name: /^Libri,/ }).click();
    await capture("sacco-della-slitta");
    for (const item of ["Lanterna", "Biscotti", "Sciarpe"]) {
      await page.getByRole("button", { name: new RegExp(`^${item},`) }).click();
    }
    const extra = page.getByRole("button", { name: /^Tazze,/ });
    await extra.click();
    await expect(submit).toBeDisabled();
    await extra.click();
    await expect(page.getByText("16 / 16 kg")).toBeVisible();
    await expect(page.getByText("12 / 12 spazi")).toBeVisible();
    await finish();

    await page
      .getByRole("button", { name: "Gioca: La cartolina scomparsa" })
      .click();
    const tryCode = page.getByRole("button", { name: "Prova il codice" });
    await page.getByRole("textbox", { name: "Tre cifre" }).fill("374");
    await expect(tryCode).toBeDisabled();
    await page.getByRole("textbox", { name: "Tre cifre" }).clear();
    await capture("cartolina-ufficio-postale");
    for (const name of ["Registro", "Cartolina", "Finestra", "Scaffale"]) {
      await page
        .getByRole("button", { name: `Esamina ${name}`, exact: true })
        .press("Enter");
      await expect(page.locator(".escape-notes strong")).toHaveText(name);
    }
    await page.getByRole("textbox", { name: "Tre cifre" }).fill("374");
    await tryCode.click();
    await expect(
      page.getByRole("heading", { name: "La stanza della lanterna" }),
    ).toBeFocused();
    await capture("cartolina-stanza-lanterna");
    for (const name of [
      "Lanterna",
      "Cartolina sul banco",
      "Mappa dei passaggi",
    ]) {
      await page
        .getByRole("button", { name: `Esamina ${name}`, exact: true })
        .click();
      await expect(page.locator(".escape-notes strong")).toHaveText(name);
    }
    const exit = page.getByRole("button", { name: "Renna", exact: true });
    await expect(exit).toBeDisabled();
    await page.getByRole("button", { name: "Lamina forata" }).click();
    await page
      .getByRole("button", { name: "Esamina Lanterna", exact: true })
      .click();
    await expect(page.getByText("La lamina è nella lanterna.")).toBeVisible();
    await page
      .getByRole("button", { name: "Esamina Cartolina sul banco", exact: true })
      .click();
    await expect(page.getByText(/R N A/)).toBeVisible();
    await exit.click();
    await expect(page.locator(".competition-play")).toContainText("100 punti");
    await page.getByRole("button", { name: "Torna alle sfide" }).click();
    await page.getByRole("button", { name: "Gioca: Prendi i pacchi" }).click();
    await page.getByRole("button", { name: "Fai partire il nastro" }).click();
    for (let wave = 1; wave <= 8; wave++) {
      await expect(
        page.getByText(`Consegna ${wave} di 8`, { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".belt-ticket strong")).toHaveText(
        /^Cerca il timbro:/,
      );
      if (wave === 1) await capture("prendi-i-pacchi");
      const target = (
        await page.locator(".belt-ticket strong").innerText()
      ).replace("Cerca il timbro: ", "");
      const parcel = page.getByRole("button", {
        name: `Prendi il pacco con timbro ${target}`,
      });
      if (wave === 1) {
        const belt = page.getByRole("group", { name: "Pacchi sul nastro" });
        await expect(belt).toBeFocused();
        await belt.press(await parcel.getAttribute("aria-keyshortcuts"));
      } else if (wave === 2) {
        await parcel.tap();
      } else {
        await parcel.click();
      }
    }
    await expect(page.locator(".competition-play")).toContainText("100 punti");
    await page.getByRole("button", { name: "Torna alle sfide" }).click();

    await expect(standings.getByText("405 pt", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Gioca: Quiz di Natale" }).click();
    const play = page.locator(".competition-play");
    for (let question = 1; question <= 10; question++) {
      await expect(play.getByText(`Domanda ${question} di 10`)).toBeVisible();
      const prompt = await play.getByRole("heading").textContent();
      const choices = await play
        .locator(".competition-options button")
        .allTextContents();
      const entry = quizQuestions.find(
        ([text, options]) =>
          text === prompt &&
          options.every((option) => choices.includes(option)),
      );
      expect(entry, prompt).toBeTruthy();
      await play
        .getByRole("button", { name: entry[1][entry[2]], exact: true })
        .click();
    }
    await expect(play).toContainText("300 punti");
    await page.getByRole("button", { name: "Torna alle sfide" }).click();
    await expect(standings.getByText("705 pt", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Dettaglio punti di Anna Sfide" })
      .click();
    const detail = page.getByRole("dialog", {
      name: "Dettaglio punti di Anna Sfide",
    });
    await expect(detail.getByText("Timbri distinti (1 × 5)")).toBeVisible();
    await expect(detail.getByText("5 punti", { exact: true })).toBeVisible();
    await expect(detail.getByText("100 punti", { exact: true })).toHaveCount(4);
    await expect(detail.getByText("0 punti", { exact: true })).toHaveCount(2);
    await expect(detail.getByText("300 punti", { exact: true })).toBeVisible();
    await expect(detail.getByText("705 punti", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);

    if (directory) {
      mkdirSync(directory, { recursive: true });
      await standings.screenshot({
        path: join(directory, "bicchieri-sfide-mobile.png"),
      });
      await page.setViewportSize({ width: 1536, height: 1024 });
      await standings.screenshot({
        path: join(directory, "bicchieri-sfide-desktop.png"),
      });
    }
    expect(
      (await organizer.post(`${eventPath}/archive`, { data: {} })).ok(),
    ).toBeTruthy();
    await openCompetition(page, event.id);
    await expect(page.getByText(/Edizione \d+ · Conclusa/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Gioca il duello" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Gioca: Quiz di Natale" }),
    ).toHaveCount(0);
    await expect(standings.getByText("705 pt", { exact: true })).toBeVisible();
  } finally {
    await friendBrowser?.close();
    await Promise.all([organizer.dispose(), friend.dispose(), third.dispose()]);
  }
});
