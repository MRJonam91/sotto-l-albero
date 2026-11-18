import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Keep the real app, layout and focus handling; isolate the unrelated backend.
async function openApp(page, events = [], start = "/") {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const responses = {
      "/api/me": {
        user: {
          id: "navigation-qa",
          name: "Ada",
          email: "ada@example.test",
          organizer: false,
          avatar: null,
          phone: "",
        },
        local: true,
        mailConfigured: false,
      },
      "/api/events": { events },
      "/api/stamps": { stamps: [] },
      "/api/preferences/amazon": { allowed: false },
      "/api/practice/access": { allowed: false },
    };
    for (const event of events) {
      responses[`/api/events/${event.id}`] = {
        event: {
          ...event,
          version: 1,
          budget: 20,
          drawAt: "2026-12-20T12:00:00Z",
        },
        members: event.membership
          ? [
              {
                id: `member-${event.id}`,
                userId: "navigation-qa",
                name: "Ada",
                status: event.membership,
              },
            ]
          : [],
        rules: [],
        wishlist: [],
        invites: [],
      };
      responses[`/api/competition/${event.id}`] = {
        year: 2026,
        closed: false,
        canPlay: event.membership === "approved",
        games: [],
        leaderboard: [],
        duels: [],
        active: [],
      };
      responses[`/api/competition/${event.id}/tris-duels`] = { duels: [] };
    }
    if (!(path in responses))
      throw new Error(`Unexpected API request: ${path}`);
    await route.fulfill({ json: responses[path] });
  });
  await page.goto(start);
  await expect(page).toHaveTitle(/Sotto l’Albero/);
  await expect(
    page.getByRole("navigation", { name: "Navigazione principale" }),
  ).toBeVisible();
}

for (const width of [320, 390, 430, 1440]) {
  test.describe(`Navigazione a ${width}px`, () => {
    test.use({
      viewport: { width, height: 844 },
      hasTouch: true,
      isMobile: width < 760,
    });

    test("i sei menu restano raggiungibili dopo ogni cambio di sezione", async ({
      page,
      browserName,
    }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type()))
          errors.push(message.text());
      });
      await openApp(page);
      const nav = page.getByRole("navigation", {
        name: "Navigazione principale",
      });
      await expect(nav.getByRole("button")).toHaveText([
        "Eventi",
        "Desideri",
        "Giochi",
        "Sfide",
        "Nome segreto",
        "Archivio",
      ]);
      for (const [label, path] of [
        ["I desideri", "/desideri"],
        ["Archivio", "/archivio"],
        ["Giochi", "/giochi"],
        ["Sfide", "/sfide"],
        ["Nome segreto", "/nome"],
        ["I miei eventi", "/"],
        ["I desideri", "/desideri"],
      ]) {
        await nav.getByRole("button", { name: label, exact: true }).tap();
        await expect(page).toHaveURL(new URL(path, page.url()).href);
        await expect(page.locator("#main")).toBeFocused();
        await expect(page.locator("vite-error-overlay")).toHaveCount(0);
        await expect(
          nav.getByRole("button", { name: label, exact: true }),
        ).toHaveAttribute("aria-current", "page");
        await expect
          .poll(() =>
            nav.getByRole("button").evaluateAll((buttons) =>
              buttons.every((button) => {
                const rect = button.getBoundingClientRect();
                const hit = document.elementFromPoint(
                  rect.x + rect.width / 2,
                  rect.y + rect.height / 2,
                );
                return (
                  rect.top >= 0 &&
                  rect.bottom <= innerHeight &&
                  rect.left >= 0 &&
                  rect.right <= innerWidth &&
                  button.contains(hit)
                );
              }),
            ),
          )
          .toBe(true);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
      }
      expect(errors).toEqual([]);
      const output =
        process.env.ARTIFACT_DIR || join(tmpdir(), "sotto-l-albero-qa");
      mkdirSync(output, { recursive: true });
      await page.screenshot({
        path: join(output, `navigation-${browserName}-${width}.png`),
      });
    });
  });
}

test("apre l’unico evento approvato, cambia scheda nello stesso evento e conserva il percorso", async ({
  page,
}) => {
  await openApp(page, [
    {
      id: "ready",
      name: "Natale insieme",
      status: "drawn",
      membership: "approved",
      isAdmin: false,
    },
    {
      id: "pending",
      name: "In attesa",
      status: "open",
      membership: "pending",
      isAdmin: false,
    },
  ]);
  const nav = page.getByRole("navigation", { name: "Navigazione principale" });
  await nav.getByRole("button", { name: "Sfide", exact: true }).click();
  await expect(page).toHaveURL(/\/sfide\?event=ready$/);
  await expect(
    page.getByRole("heading", { name: "Giochi del gruppo" }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Nome segreto", exact: true }).click();
  await expect(page).toHaveURL(/\/nome\?event=ready$/);
  await expect(
    page.getByRole("button", {
      name: "Apri il sigillo e scopri il destinatario",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Apri il sigillo e scopri il destinatario",
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/sfide\?event=ready$/);
  await expect(
    page.getByRole("heading", { name: "Giochi del gruppo" }),
  ).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/nome\?event=ready$/);
  await expect(
    page.getByRole("button", {
      name: "Apri il sigillo e scopri il destinatario",
    }),
  ).toBeVisible();
});

test("con più eventi chiede quale aprire e non apre la lettera di un’iscrizione in attesa", async ({
  page,
}) => {
  await openApp(
    page,
    [
      {
        id: "first",
        name: "Natale amici",
        status: "drawn",
        membership: "approved",
        isAdmin: false,
      },
      {
        id: "second",
        name: "Natale famiglia",
        status: "drawn",
        membership: "approved",
        isAdmin: false,
      },
      {
        id: "pending",
        name: "Natale in attesa",
        status: "drawn",
        membership: "pending",
        isAdmin: false,
      },
    ],
    "/nome",
  );
  await expect(
    page.getByRole("heading", {
      name: "Scegli lo scambio per il nome segreto",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Natale famiglia/ }).click();
  await expect(page).toHaveURL(/\/nome\?event=second$/);
  await expect(
    page.getByRole("button", {
      name: "Apri il sigillo e scopri il destinatario",
    }),
  ).toBeVisible();
  await page.goto("/nome?event=pending");
  await expect(
    page.getByText("La tua iscrizione è in attesa di conferma.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Apri il sigillo e scopri il destinatario",
    }),
  ).toHaveCount(0);
});

test("chi organizza senza partecipare mantiene la restrizione sul proprio nome", async ({
  page,
}) => {
  await openApp(
    page,
    [
      {
        id: "owner",
        name: "Natale organizzato",
        status: "drawn",
        membership: null,
        isAdmin: true,
      },
    ],
    "/nome",
  );
  await expect(page).toHaveURL(/\/nome\?event=owner$/);
  await expect(
    page.getByRole("heading", { name: "Estrazione riservata ai partecipanti" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Apri il sigillo e scopri il destinatario",
    }),
  ).toHaveCount(0);
});
