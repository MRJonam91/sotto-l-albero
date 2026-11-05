import { test, expect, request } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const output = process.env.ARTIFACT_DIR || join(tmpdir(), "sotto-l-albero-qa");
mkdirSync(output, { recursive: true });
test("Browser desktop e mobile: accesso, creazione, desideri, rivelazione ed effetti ridotti", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/");
  await expect(page).toHaveTitle(/Sotto l’Albero/);
  await expect(
    page.getByRole("heading", { name: "Bentrovato, accomodati." }),
  ).toBeVisible();
  await page.screenshot({
    path: output + "/accesso-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Come ti chiami?").fill("Organizzatore");
  await page.getByLabel("La tua email").fill("browser@example.test");
  await page.getByRole("button", { name: "Ricevi il codice" }).click();
  const code = await page.locator(".local-code strong").textContent();
  await page.getByLabel("Codice di accesso").fill(code);
  await page.getByRole("button", { name: "Entra", exact: true }).click();
  await page.getByRole("button", { name: "Crea un Secret Santa" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Come lo chiamiamo?").fill("Il Natale degli amici");
  await page.getByLabel("Nome del gruppo").fill("Amici della domenica");
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
    .getByRole("button", { name: "Crea l’evento", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Il Natale degli amici" }),
  ).toBeVisible();
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
  const people = [];
  for (const [i, name] of ["Anna", "Bruno", "Carla"].entries()) {
    const c = await request.newContext({ baseURL: "http://127.0.0.1:8787" });
    const email = `browser-${Date.now()}-${i}@example.test`;
    const auth = await c
      .post("/api/auth/request", { data: { email, name } })
      .then((r) => r.json());
    await c.post("/api/auth/verify", { data: { email, code: auth.devCode } });
    await c.post(`/api/events/${link.id}/join`, { data: { token } });
    people.push(c);
  }
  await page.getByRole("button", { name: "Organizza", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Organizza", exact: true }).click();
  const confirm = page.getByRole("button", { name: "Conferma", exact: true });
  await expect(confirm).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await confirm.first().click();
    await expect(confirm).toHaveCount(2 - i);
  }
  for (const c of people)
    await c.put(`/api/events/${link.id}/wishlist`, {
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
