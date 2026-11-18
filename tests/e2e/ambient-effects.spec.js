import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function mockAuthPage(page) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/me") {
      await route.fulfill({
        json: { user: null, local: true, mailConfigured: false },
      });
      return;
    }
    throw new Error(`Unexpected API request: ${path}`);
  });
  await page.goto("/");
  await expect(page).toHaveTitle(/Sotto l’Albero/);
}

test("controllo neve (basso, medio, bufera) e altri effetti natalizi accessibili su desktop e mobile", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await mockAuthPage(page);

  const canvas = page.locator(".ambient-effects-canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-snow", "low");

  const trigger = page.locator(".snow-control");
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Atmosfera di Natale" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("radio", { name: /Medio/ }).click();
  await expect(canvas).toHaveAttribute("data-snow", "medium");

  await dialog.getByRole("radio", { name: /Bufera/ }).click();
  await expect(canvas).toHaveAttribute("data-snow", "blizzard");

  for (const label of [
    /Scintille/,
    /Fuochi d’artificio/,
    /Fumo caminetto/,
    /Apparizione caramelle/,
  ]) {
    await dialog.getByRole("button", { name: label }).click();
  }

  await expect(canvas).toHaveAttribute(
    "data-extras",
    "sparkles,fireworks,fireplace,candies",
  );
  await expect(trigger.locator(".snow-badge")).toHaveText("5");

  const desktopA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(desktopA11y.violations).toEqual([]);

  await dialog.getByRole("button", { name: "Fatto" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(canvas).toHaveAttribute("data-snow", "blizzard");
  await expect(canvas).toHaveAttribute(
    "data-extras",
    "sparkles,fireworks,fireplace,candies",
  );

  // Mobile 320px layout + accessibility + turn off all
  await page.setViewportSize({ width: 320, height: 760 });
  await trigger.click();
  await expect(dialog).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const mobileA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(mobileA11y.violations).toEqual([]);

  await dialog.getByRole("button", { name: "Spegni tutto" }).click();
  await expect(canvas).toHaveCount(0);
  await dialog.getByRole("button", { name: "Fatto" }).click();

  // Re-enable medium snow, then verify reduced motion pauses canvas
  await trigger.click();
  await dialog.getByRole("radio", { name: /Medio/ }).click();
  await dialog.getByRole("button", { name: "Fatto" }).click();
  await expect(canvas).toHaveAttribute("data-snow", "medium");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(canvas).toHaveCount(0);

  expect(errors).toEqual([]);
});
