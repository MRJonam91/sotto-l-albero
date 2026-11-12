import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Keep the real app, layout and focus handling; isolate the unrelated backend.
async function openApp(page) {
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
      "/api/events": { events: [] },
      "/api/stamps": { stamps: [] },
      "/api/practice/access": { allowed: false },
    };
    if (!(path in responses))
      throw new Error(`Unexpected API request: ${path}`);
    await route.fulfill({ json: responses[path] });
  });
  await page.goto("/");
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

    test("i quattro menu restano raggiungibili dopo ogni cambio di sezione", async ({
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
      for (const [label, path] of [
        ["I desideri", "/desideri"],
        ["Archivio", "/archivio"],
        ["Giochi", "/giochi"],
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
