import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function uiLogin(page, email, name) {
  await page.goto("/");
  await page.getByLabel("Come ti chiami?").fill(name);
  await page.getByLabel("La tua email").fill(email);
  await page.getByRole("button", { name: "Ricevi il codice" }).click();
  const code = await page.locator(".local-code strong").textContent();
  await page.getByLabel("Codice di accesso").fill(code);
  await page.getByRole("button", { name: "Entra", exact: true }).click();
}

test("al login richiama il percorso guidato una volta al giorno e permette di ignorare o completare", async ({
  page,
}) => {
  test.setTimeout(70_000);
  await page.setViewportSize({ width: 320, height: 844 });

  // Utente 1: ignora il check-in giornaliero al login
  const skipEmail = `skip-${Date.now()}@example.test`;
  await uiLogin(page, skipEmail, "Giulia");

  const strip = page.locator(".daily-checkin-strip");
  await expect(strip).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);

  const a11yStrip = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11yStrip.violations).toEqual([]);

  await strip.getByRole("button", { name: "Ignora per oggi" }).click();
  await expect(strip).toHaveCount(0);
  await expect(page.locator(".daily-checkin-feedback")).toContainText(
    "Hai ignorato il check-in di oggi",
  );

  // Ricaricando la pagina lo stesso giorno non riappare
  await page.reload();
  await expect(page.locator(".daily-checkin-strip")).toHaveCount(0);

  // Anche uscendo e rifacendo login nello stesso giorno non riappare
  await page.getByRole("button", { name: "Apri il mio profilo" }).click();
  await expect(page.locator(".guided-impact-notice")).toContainText(
    "Oggi hai ignorato il check-in rapido al login",
  );
  await page.getByRole("button", { name: "Esci" }).click();
  await page.getByRole("button", { name: "Ho già un account" }).click();
  await page.getByLabel("La tua email").fill(skipEmail);
  await page.getByRole("button", { name: "Ricevi il codice" }).click();
  const reCode = await page.locator(".local-code strong").textContent();
  await page.getByLabel("Codice di accesso").fill(reCode);
  await page.getByRole("button", { name: "Entra", exact: true }).click();
  await expect(page.locator(".daily-checkin-strip")).toHaveCount(0);

  // Verifica nel profilo che la completezza sia impattata (0%)
  await page.getByRole("button", { name: "Apri il mio profilo" }).click();
  await page.getByRole("button", { name: /5.*Ritratto/i }).click();
  await expect(page.locator(".guided-confidence-bar")).toContainText(
    "Completezza ritratto: 0%",
  );
  await expect(page.locator(".guided-confidence-bar")).toContainText(
    "bassa",
  );

  await page.getByRole("button", { name: "Esci" }).click();

  // Utente 2: apre il percorso guidato dal login e completa tutti i 5 passi
  const completeEmail = `complete-${Date.now()}@example.test`;
  await uiLogin(page, completeEmail, "Marco");

  const startStrip = page.locator(".daily-checkin-strip");
  await expect(startStrip).toBeVisible();
  await startStrip
    .getByRole("button", { name: /Inizia percorso guidato/ })
    .click();

  const wizard = page.getByRole("dialog").locator(".daily-checkin-banner");
  await expect(wizard).toBeVisible();
  await expect(wizard).toContainText("Passaggio 1 di 5");
  // Passo 1: Attività e frase
  await wizard
    .getByRole("button", { name: /Progetto trappole ingegnose/ })
    .click();
  await wizard.getByRole("button", { name: "Continua" }).click();

  // Passo 2: Messaggio a icone
  await expect(wizard).toContainText("Passaggio 2 di 5");
  await wizard.getByRole("button", { name: /Albero di Natale/ }).click();
  await wizard.getByRole("button", { name: /Enigma natalizio/ }).click();
  await wizard.getByRole("button", { name: "Continua" }).click();

  // Passo 3: Indovinello
  await expect(wizard).toContainText("Passaggio 3 di 5");
  await wizard.getByRole("button", { name: "Usa: Dolce a righe" }).click();
  await wizard.getByRole("button", { name: "Continua" }).click();

  // Passo 4: Domanda del giorno e scelte
  await expect(wizard).toContainText("Passaggio 4 di 5");
  await wizard.locator(".holiday-choice-btn").first().click();
  await wizard.getByRole("button", { name: "Continua" }).click();

  // Passo 5: Ritratto finale, immagine, grafico e personaggi dei film
  await expect(wizard).toContainText("Passaggio 5 di 5");
  await expect(wizard.locator(".spirit-generated-svg")).toBeVisible();
  await expect(wizard.locator(".portrait-radar-svg")).toBeVisible();
  await expect(wizard.locator(".character-comparison-item")).toHaveCount(6);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);

  const a11yPortrait = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11yPortrait.violations).toEqual([]);

  await wizard.getByRole("button", { name: "Approva e salva per oggi" }).click();
  await expect(wizard).toHaveCount(0);
  await expect(page.locator(".daily-checkin-strip")).toHaveCount(0);
  await expect(page.locator(".daily-checkin-feedback")).toContainText(
    "Ritratto di Natale salvato per oggi",
  );

  // Ricarica: non richiede più per oggi
  await page.reload();
  await expect(page.locator(".daily-checkin-strip")).toHaveCount(0);
});
