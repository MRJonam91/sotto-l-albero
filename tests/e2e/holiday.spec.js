import { test, expect, request as requestFactory } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const output = process.env.ARTIFACT_DIR || join(tmpdir(), "sotto-l-albero-qa");
mkdirSync(output, { recursive: true });

let organizer, group;

async function signIn(request, email, name = "Ada") {
  const otp = await request.post("/api/auth/request", {
    data: { email, name, phone: "+393200000000" },
  });
  expect(otp.ok()).toBeTruthy();
  const { devCode } = await otp.json();
  expect(
    (
      await request.post("/api/auth/verify", { data: { email, code: devCode } })
    ).ok(),
  ).toBeTruthy();
}

test.beforeAll(async ({ baseURL }) => {
  organizer = await requestFactory.newContext({ baseURL });
  await signIn(organizer, "admin@example.test", "Organizzatore QA");
  const future = (days) =>
    new Date(Date.now() + days * 86_400_000).toISOString();
  const result = await organizer.post("/api/events", {
    data: {
      name: "Gruppo di prova dei giochi",
      budget: 20,
      closeAt: future(7),
      drawAt: future(9),
      giftAt: future(14),
    },
  });
  expect(result.ok()).toBeTruthy();
  group = (await result.json()).event;
});

test.afterAll(async () => {
  await organizer?.dispose();
});

async function joinGames(request, approve = true) {
  const path = `/api/events/${group.id}`;
  const joined = await request.post(path + "/join", {
    data: { token: group.inviteToken },
  });
  expect(joined.ok()).toBeTruthy();
  const { user } = await (await request.get("/api/me")).json();
  const { members } = await (await organizer.get(path)).json();
  const member = members.find((entry) => entry.userId === user.id);
  const change = async (status) => {
    const result = await organizer.post(`${path}/members/${member.id}`, {
      data: { status },
    });
    expect(result.ok()).toBeTruthy();
  };
  if (approve) await change("approved");
  return change;
}

test.describe("Profilo e caccia su schermo tattile", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("Tocco sulla stella, avatar nel profilo e download di un ritratto locale", async ({
    page,
  }) => {
    const email = `profile-${Date.now()}@example.test`;
    const otp = await page.request.post("/api/auth/request", {
      data: { email, name: "Ada", phone: "+393200000000" },
    });
    const { devCode } = await otp.json();
    expect(
      (
        await page.request.post("/api/auth/verify", {
          data: { email, code: devCode },
        })
      ).ok(),
    ).toBe(true);
    await page.goto("/");
    await page.getByRole("button", { name: "Una stella da accendere" }).tap();
    await expect(page.getByRole("dialog").getByRole("status")).toContainText(
      "Timbro raccolto",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Apri il mio profilo" }).click();
    await page
      .getByRole("link", { name: "Album dei timbri", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Rileggi la sorpresa: Stella d’oro" })
      .tap();
    await expect(
      page.getByRole("dialog").getByText("“I know him!”"),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog").getByRole("link", { name: /Warner Bros/ }),
    ).toHaveAttribute("href", "https://www.youtube.com/watch?v=HebbNljYRzE");
    await page.keyboard.press("Escape");
    await page
      .getByRole("link", { name: "Avatar e identità", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Scegli un personaggio", exact: true })
      .click();
    const presets = page.locator(".profile-preset-grid button");
    await presets.first().click();
    await page.getByRole("button", { name: "Salva avatar" }).click();
    await expect(
      page.getByText("Il tuo avatar è pronto.", { exact: false }),
    ).toBeVisible();
    await expect(page.locator(".profile .avatar-art")).toBeVisible();
    await page.reload();
    await expect(page.locator(".profile .avatar-art")).toBeVisible();
    await page.getByRole("button", { name: "Usa una foto" }).click();
    await expect(page.locator(".photo-editor")).not.toContainText(/telegram/i);
    await expect(
      page.getByRole("button", { name: "Cambia atmosfera" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Atmosfera natalizia")).toHaveCount(0);
    await page.route("**/avatar-models/*.tflite", (route) => route.abort());
    const originalRequests = [];
    page.on("request", (request) => {
      if (/\/photo-(original|backup)$/.test(request.url()))
        originalRequests.push(request.url());
    });
    const png = await page.evaluate(() => {
      const image = document.createElement("canvas");
      image.width = image.height = 160;
      const ctx = image.getContext("2d");
      ctx.fillStyle = "#779780";
      ctx.fillRect(0, 0, 160, 160);
      ctx.fillStyle = "#efbf92";
      ctx.beginPath();
      ctx.ellipse(80, 80, 39, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#412d24";
      ctx.fillRect(62, 70, 8, 6);
      ctx.fillRect(91, 70, 8, 6);
      ctx.fillRect(74, 102, 17, 4);
      return image.toDataURL("image/png").split(",")[1];
    });
    await page.getByLabel("Scegli una foto").setInputFiles({
      name: "ritratto-test.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await expect(page.locator(".photo-framing-stage")).toBeVisible();
    await expect(page.locator(".photo-adjustments")).not.toHaveAttribute(
      "open",
      "",
    );
    await page
      .getByRole("button", { name: "Cambia atmosfera", exact: true })
      .tap();
    await page.getByLabel("Atmosfera natalizia").selectOption("chimney");
    await expect(page.locator(".photo-atmosphere-name")).toHaveText(
      "Dentro il camino",
    );
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Scarica il ritratto in alta risoluzione" })
      .click();
    expect((await download).suggestedFilename()).toMatch(/\.(png|webp|jpe?g)$/);
    expect(originalRequests).toEqual([]);
    const savePortrait = page.getByRole("button", {
      name: "Salva avatar",
      exact: true,
    });
    await expect(savePortrait).toBeEnabled();
    await savePortrait.click();
    await expect(
      page.locator('.profile img[src*="/api/avatars/"]').first(),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: join(output, "avatar-mobile.png"),
      fullPage: true,
    });
    await expect(page.locator(".photo-editor")).toContainText(
      "L’editor elabora la foto sul tuo dispositivo.",
    );
    const sendBackup = page.getByRole("button", {
      name: "Invia la copia privata",
    });
    await expect(sendBackup).toHaveCount(0);
    await expect(page.locator(".photo-backup")).toHaveCount(0);
    expect(originalRequests).toEqual([]);

    await page.route("**/api/profile", async (route) => {
      const response = await route.fetch();
      const profile = await response.json();
      await route.fulfill({
        response,
        json: { ...profile, photoBackupAvailable: true },
      });
    });
    await page.reload();
    await page.getByRole("button", { name: "Usa una foto" }).click();
    const photo = Buffer.from(png, "base64");
    await page.getByLabel("Scegli una foto").setInputFiles({
      name: "ritratto-test.png",
      mimeType: "image/png",
      buffer: photo,
    });
    await expect(page.locator(".photo-editor")).not.toContainText(/telegram/i);
    await expect(sendBackup).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", {
        name: "Invia una copia dell’originale al gestore",
      }),
    ).toHaveCount(0);
    await expect.poll(() => originalRequests.length).toBe(1);
  });
});

test("Caccia, quiz e memory su telefono salvano i timbri nel profilo", async ({
  page,
}) => {
  test.setTimeout(80_000);
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const checkLayout = async () => {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
  };
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

  await page.getByLabel("Come ti chiami?").fill("Ada");
  await page
    .getByLabel("La tua email")
    .fill(`timbri-${Date.now()}@example.test`);
  await page.getByRole("button", { name: "Ricevi il codice" }).click();
  await page
    .getByLabel("Codice di accesso")
    .fill(await page.locator(".local-code strong").textContent());
  await page.getByRole("button", { name: "Entra", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Giochi", exact: true }),
  ).toBeVisible();
  await joinGames(page.request);

  for (const [section, target] of [
    [null, "Una stella da accendere"],
    [null, "Una teiera fuori posto"],
    ["I desideri", "Un pacchetto tra i desideri"],
    ["Archivio", "Una campanella nell’archivio"],
  ]) {
    if (section) {
      await page.getByRole("button", { name: section, exact: true }).click();
      await expect(page.locator("#main")).toBeFocused();
    }
    const object = page.getByRole("button", { name: target });
    await object.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("status")).toContainText("Timbro raccolto");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(object).toBeFocused();
  }

  await page.getByRole("button", { name: "Apri il mio profilo" }).click();
  await page
    .getByRole("link", { name: "Album dei timbri", exact: true })
    .click();
  await expect(page.getByText("4 di 22 timbri", { exact: true })).toBeVisible();
  await page.getByText("Mostra il ritornello", { exact: true }).first().click();
  await expect(
    page.getByText("Cinque domande, una dopo l’altra,", { exact: false }),
  ).toBeVisible();
  await checkLayout();
  await checkAccessibility();
  await page.reload();
  await expect(page.getByText("4 di 22 timbri", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Giochi", exact: true }).click();
  await page
    .getByRole("button", { name: "Quiz di Natale", exact: true })
    .click();
  await checkLayout();
  await checkAccessibility();
  const answers = [
    "Panettone",
    "La Befana",
    "Vigilia di Natale",
    "Terno",
    "Un fiocco di neve",
  ];
  for (const [index, answer] of answers.entries()) {
    await page.getByRole("button", { name: answer, exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Esatto!");
    await page
      .getByRole("button", {
        name: index === 4 ? "Vedi il risultato" : "Prossima domanda",
      })
      .click();
  }
  await expect(page.getByText("Hai indovinato 5 risposte su 5.")).toBeVisible();
  await page.getByRole("button", { name: "Raccogli il timbro" }).click();
  await expect(page.getByRole("status")).toContainText("Maestro del quiz");

  await page
    .getByRole("button", { name: "Memory di Natale", exact: true })
    .click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await checkLayout();
  const memory = page.locator(".memory-grid");
  const covered = (position) =>
    memory.getByRole("button", { name: `Carta ${position + 1}, coperta` });
  await expect(memory.getByRole("button")).toHaveCount(16);
  await expect(memory.locator(".memory-turner").first()).toHaveCSS(
    "transition-property",
    "transform",
  );
  expect(
    await memory.evaluate(
      (board) => getComputedStyle(board).gridTemplateColumns.split(" ").length,
    ),
  ).toBe(4);
  const known = new Map(),
    remaining = new Set(Array.from({ length: 16 }, (_, position) => position));
  const savedPosition = (position) =>
    [...remaining].find(
      (other) =>
        position !== other &&
        known.get(position) &&
        known.get(other) === known.get(position),
    );
  async function flip(position) {
    const response = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/practice/memory/step",
    );
    await covered(position).click();
    const result = await response;
    expect(result.ok()).toBeTruthy();
    const state = await result.json();
    known.set(position, state.cards[position].name);
    return state;
  }
  let mismatches = 0;
  while (remaining.size) {
    const first =
      [...remaining].find(
        (position) => savedPosition(position) !== undefined,
      ) ?? [...remaining].find((position) => !known.has(position));
    await flip(first);
    const second =
      savedPosition(first) ??
      [...remaining].find(
        (position) => position !== first && !known.has(position),
      );
    const state = await flip(second);
    if (state.cover) {
      mismatches++;
      await expect(covered(first)).toBeVisible();
      await expect(covered(second)).toBeVisible();
    } else {
      remaining.delete(first);
      remaining.delete(second);
      const matched = memory.getByRole("button", {
        name: new RegExp(`^Carta ${first + 1}, .+coppia trovata`),
      });
      await expect(matched).toBeDisabled();
      await expect(matched).toHaveCSS("animation-name", "memory-pair");
    }
  }
  expect(mismatches).toBeGreaterThan(0);
  await expect(memory.locator("img")).toHaveCount(16);
  await expect
    .poll(() =>
      memory
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.screenshot({
    path: join(output, "memory-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 980 });
  await page
    .locator(".memory-board")
    .screenshot({ path: join(output, "memory-desktop.png") });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(memory.locator(".memory-turner").first()).toHaveCSS(
    "transition-property",
    "none",
  );
  await expect(page.getByText("Hai trovato tutte le coppie!")).toBeVisible();
  await page.getByRole("button", { name: "Raccogli il timbro" }).click();
  await expect(
    page.getByText("Timbro raccolto: Memoria da elfo."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Il mio album" }).click();
  await expect(page.getByText("6 di 22 timbri", { exact: true })).toBeVisible();
});

test("I giochi richiedono un posto confermato e chiudono l’accesso dopo la rimozione", async ({
  page,
}) => {
  await page.goto("/giochi");
  await expect(
    page.getByRole("button", { name: "Memory di Natale", exact: true }),
  ).toHaveCount(0);
  expect((await page.request.get("/api/practice/access")).status()).toBe(401);
  await signIn(page.request, `giochi-${Date.now()}@example.test`);
  const change = await joinGames(page.request, false);
  await page.reload();
  const access = () =>
    page.request
      .get("/api/practice/access")
      .then((response) => response.json());
  expect(await access()).toEqual({ allowed: false });
  expect(
    (
      await page.request.post("/api/practice/memory/start", { data: {} })
    ).status(),
  ).toBe(403);
  await expect(
    page.getByRole("button", { name: "Memory di Natale", exact: true }),
  ).toHaveCount(0);
  await change("approved");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Memory di Natale", exact: true }),
  ).toBeVisible();
  await change("removed");
  expect(await access()).toEqual({ allowed: false });
  expect(
    (
      await page.request.post("/api/practice/memory/start", { data: {} })
    ).status(),
  ).toBe(403);
});

test("Le figure a orario compaiono e scompaiono senza ricaricare la pagina", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const email = `apparizioni-${Date.now()}@example.test`;
  const request = await page.request.post("/api/auth/request", {
    data: { email, name: "Ada", phone: "+393200000000" },
  });
  expect(request.ok()).toBeTruthy();
  const { devCode } = await request.json();
  const login = await page.request.post("/api/auth/verify", {
    data: { email, code: devCode },
  });
  expect(login.ok()).toBeTruthy();
  await joinGames(page.request);

  await page.clock.install({ time: new Date("2026-12-24T23:04:00Z") });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Una stella da accendere" }),
  ).toBeVisible();
  const santa = page.getByRole("button", {
    name: "Scopri Babbo Natale",
    exact: true,
  });
  await expect(santa).toHaveCount(0);
  await page.clock.fastForward(60_000);
  await expect(santa).toBeVisible();
  await santa.focus();
  await expect(santa).toBeFocused();
  await page.clock.fastForward(60 * 60_000);
  await expect(santa).toHaveCount(0);

  for (const [utcHour, section, figure] of [
    ["05", "Archivio", "Cristallo di ghiaccio"],
    ["07", "Giochi", "Biscotti di Natale"],
    ["11", "I desideri", "Cappello di Babbo Natale"],
    ["18", "I miei eventi", "Renna della sera"],
    ["20", "I miei eventi", "Slitta sulla neve"],
  ]) {
    await page.clock.setSystemTime(new Date(`2026-12-25T${utcHour}:00:00Z`));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.getByRole("button", { name: section, exact: true }).click();
    await expect(
      page.getByRole("button", { name: `Scopri ${figure}`, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("button", { name: "Scopri Renna della sera", exact: true }),
  ).toHaveCount(0);
});
