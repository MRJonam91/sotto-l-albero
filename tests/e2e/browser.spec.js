import { test, expect, request } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const output = process.env.ARTIFACT_DIR || join(tmpdir(), "sotto-l-albero-qa");
const baseURL = process.env.QA_BASE_URL || "http://127.0.0.1:8790";
mkdirSync(output, { recursive: true });
test("Browser desktop e mobile: accesso, creazione, desideri, rivelazione ed effetti ridotti", async ({
  page,
  browser,
}) => {
  test.setTimeout(70_000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const checkAccessibility = async () => {
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map(({ target }) => target),
      })),
    ).toEqual([]);
  };
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");
  await expect(page).toHaveTitle(/Sotto l’Albero/);
  await expect(
    page.getByRole("heading", { name: "Bentrovato, accomodati." }),
  ).toBeVisible();
  await checkAccessibility();
  await page.setViewportSize({ width: 1536, height: 1024 });
  const eventRequests = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/events") eventRequests.push(r);
  });
  await page
    .getByRole("button", { name: "Sotto l’Albero, pagina iniziale" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bentrovato, accomodati." }),
  ).toBeVisible();
  await page.screenshot({
    path: output + "/accesso-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Come ti chiami?").fill("Organizzatore");
  await page.getByLabel("La tua email").fill("browser@example.test");
  await expect(page.getByLabel("Numero di telefono")).toHaveCount(0);
  await page.getByRole("button", { name: "Ricevi il codice" }).click();
  const code = await page.locator(".local-code strong").textContent();
  await page.getByLabel("Codice di accesso").fill(code);
  const anonymousRequests = eventRequests.length;
  await page.getByRole("button", { name: "Entra", exact: true }).click();
  await page.getByRole("button", { name: "Crea un Secret Santa" }).click();
  await expect(
    page.getByText("Accedi per continuare.", { exact: true }),
  ).toHaveCount(0);
  expect(anonymousRequests).toBe(0);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 760 });
  await checkAccessibility();
  await page.getByLabel("Nome dello scambio").fill("Il Natale degli amici");
  await page
    .getByRole("checkbox", { name: "Partecipo anch’io allo scambio" })
    .check();
  const future = (days) =>
    new Date(Date.now() + days * 86400000).toISOString().slice(0, 16);
  await page.getByLabel("Iscrizioni fino al").fill(future(5));
  await page.getByLabel("Estraiamo i nomi il").fill(future(8));
  await page.getByLabel("Ci scambiamo i regali il").fill(future(20));
  await page
    .getByLabel("Un messaggio per il gruppo")
    .fill(
      "Ci vediamo da noi, con qualcosa di buono da condividere. Il regalo? Basta un pensiero scelto con cura.",
    );
  await page
    .getByRole("button", { name: "Crea e invita", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Il Natale degli amici" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copia link", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await checkAccessibility();
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.screenshot({
    path: output + "/evento-desktop.png",
    fullPage: true,
  });
  const link = (
    await page.request.get("/api/events").then((r) => r.json())
  ).events.find((e) => e.name === "Il Natale degli amici");
  const detail = await page.request
    .get(`/api/events/${link.id}`)
    .then((r) => r.json());
  const token = detail.event.inviteToken;
  expect(detail.members).toEqual([
    expect.objectContaining({ status: "approved" }),
  ]);
  const people = [];
  for (const [i, name] of [
    "Anna",
    "BrunoAlessandroRossi",
    "CarlaMariaFerrari",
  ].entries()) {
    const c = await request.newContext({ baseURL });
    const email = `browser-${Date.now()}-${i}@example.test`;
    const auth = await c
      .post("/api/auth/request", {
        data: { email, name, phone: "+393200000000" },
      })
      .then((r) => r.json());
    await c.post("/api/auth/verify", { data: { email, code: auth.devCode } });
    if (i > 0) await c.post(`/api/events/${link.id}/join`, { data: { token } });
    people.push(c);
  }
  const visitor = await browser.newContext({
    baseURL,
    storageState: await people[0].storageState(),
  });
  const invitation = await visitor.newPage();
  await invitation.goto(`/invite/${token}`);
  await invitation.getByRole("button", { name: "Voglio partecipare" }).click();
  const pending = invitation.getByRole("button", {
    name: "Richiesta inviata: ti faremo sapere",
  });
  await expect(pending).toBeDisabled();
  await invitation.reload();
  await expect(pending).toBeDisabled();
  await page.getByRole("button", { name: "Organizza", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Organizza", exact: true }).click();
  const confirm = page.getByRole("button", { name: "Conferma", exact: true });
  await expect(confirm).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await confirm.first().click();
    await expect(confirm).toHaveCount(2 - i);
  }
  await invitation.reload();
  await expect(
    invitation.getByText("Il tuo posto è confermato."),
  ).toBeVisible();
  await invitation
    .getByRole("button", { name: "Apri l’evento", exact: true })
    .click();
  await expect(invitation).toHaveURL(new RegExp(`/events/${link.id}$`));
  await visitor.close();
  const competition = `/api/competition/${link.id}`;
  expect(
    (await people[0].post(competition + "/join", { data: {} })).ok(),
  ).toBeTruthy();
  const entrant = (await (await people[0].get("/api/me")).json()).user;
  expect(
    (
      await page.request.post(competition + "/adjust", {
        data: {
          userId: entrant.id,
          kind: "add",
          points: 6,
          reason: "Premio per la lettera",
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Sfide e classifica" }).click();
  await page.getByRole("button", { name: "Iscriviti alle sfide" }).click();
  await page
    .getByRole("button", { name: "Modifica punti di Organizzatore" })
    .click();
  await page.getByLabel("Punti", { exact: true }).fill("12");
  await page.getByLabel("Motivo della modifica").fill("Premio per l’invito");
  await page.getByRole("button", { name: "Salva la modifica" }).click();
  await expect(page.getByText("12 pt", { exact: true })).toBeVisible();
  const view = page.getByLabel("Visualizzazione della classifica");
  await expect(view).toHaveValue("ornaments");
  const ampolles = page.locator(".hourglass-art");
  await expect(ampolles).toHaveCount(2);
  await expect(ampolles.first().locator(".vessel-sweep")).toHaveCSS(
    "animation-name",
    "vessel-reflection",
  );
  await expect(ampolles.first().locator(".vessel-particle").first()).toHaveCSS(
    "animation-name",
    "vessel-fall",
  );
  const levels = await ampolles
    .locator(".vessel-fill-window")
    .evaluateAll((windows) =>
      windows.map((window) => Number(window.getAttribute("y"))),
    );
  expect(levels[0]).toBeLessThan(levels[1]);
  const firstReflection = await ampolles
    .first()
    .locator(".vessel-sweep")
    .elementHandle();
  await page.getByRole("button", { name: "Rianima le clessidre" }).click();
  expect(await firstReflection.evaluate((element) => element.isConnected)).toBe(
    false,
  );
  const colors = await ampolles.evaluateAll((items) =>
    items.map((item) => getComputedStyle(item).color),
  );
  expect(new Set(colors).size).toBe(2);
  await page
    .locator(".competition-standings")
    .screenshot({ path: output + "/classifica-desktop.png" });
  await view.selectOption("snowflakes");
  await expect(ampolles.first()).toHaveAttribute("data-motif", "snowflakes");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(ampolles.first().locator(".vessel-sweep")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(ampolles.first().locator(".vessel-particle").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(
    page.getByRole("button", { name: "Rianima le clessidre" }),
  ).toBeHidden();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await checkAccessibility();
  await page
    .locator(".competition-standings")
    .screenshot({ path: output + "/classifica-mobile.png" });
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await view.selectOption("list");
  await page.getByRole("button", { name: "Organizza", exact: true }).click();
  await page.getByRole("button", { name: "Sfide e classifica" }).click();
  await expect(view).toHaveValue("list");
  await expect(page.locator(".hourglass-art")).toHaveCount(0);
  await expect(page.getByText("12 pt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gioca: Memory di Natale" }).click();
  await expect(page.locator(".memory-grid button")).toHaveCount(16);
  await page.getByRole("button", { name: "Carta 1, coperta" }).click();
  await expect(page.locator(".memory-card.visible img")).toBeVisible();
  await page.getByRole("button", { name: "Torna alle sfide" }).click();
  await page.getByRole("button", { name: "Organizza", exact: true }).click();
  for (const c of [page.request, ...people]) {
    const saved = await c.put(`/api/events/${link.id}/wishlist`, {
      data: {
        items: [
          {
            type: "riddle",
            title: "Una storia da leggere sul divano",
            description: "Mi piacciono i gialli e le giornate di pioggia.",
            hint: "Si sfoglia.",
            answer: "Un libro",
          },
        ],
      },
    });
    expect(saved.ok()).toBeTruthy();
  }
  await page
    .getByRole("button", { name: "Estrai i nomi", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sì, estrai i nomi" })
    .click();
  await expect(page.getByText("Nomi estratti", { exact: true })).toBeVisible();
  await page.screenshot({
    path: output + "/organizza-desktop.png",
    fullPage: true,
  });
  const state = await people[0].storageState();
  await page.context().clearCookies();
  await page.context().addCookies(state.cookies);
  await page.goto(`/events/${link.id}`);
  await page.getByRole("button", { name: "Il nome segreto" }).click();
  await page.getByRole("button", { name: "Mostra subito il nome" }).click();
  await page.getByRole("button", { name: "Leggi i suoi desideri" }).click();
  await expect(
    page.getByText("Una storia da leggere sul divano"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mi dai un aiuto?" }).click();
  await expect(page.getByText("Si sfoglia.")).toBeVisible();
  await page.getByRole("button", { name: "Leggi la soluzione" }).click();
  await expect(page.getByText("Un libro", { exact: true })).toBeVisible();
  await page.screenshot({
    path: output + "/rivelazione-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await checkAccessibility();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const fits = await page
      .locator(".recipient-letter h2")
      .evaluate((title) => {
        const range = document.createRange();
        range.selectNodeContents(title);
        const text = range.getBoundingClientRect();
        const card = title.closest(".recipient-letter").getBoundingClientRect();
        return text.left >= card.left && text.right <= card.right;
      });
    expect(fits, `Nome leggibile a ${width} px`).toBe(true);
  }
  await page.screenshot({
    path: output + "/rivelazione-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "La mia lettera" }).click();
  await page.getByRole("button", { name: "Aggiungi un desiderio" }).click();
  const fields = page.getByLabel("Dagli un nome");
  await fields.last().fill("Una tazza per il tè");
  await page.getByRole("button", { name: "Salva la lettera" }).click();
  await expect(
    page.getByText("La tua lettera è pronta.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "La mia lettera" }).click();
  await expect(
    page.locator('input[value="Una tazza per il tè"]'),
  ).toBeVisible();
  expect(errors).toEqual([]);
  for (const c of people) await c.dispose();
});
