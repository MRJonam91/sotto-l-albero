import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

async function simulateNextRelease(page) {
  const current = await page.request.get("/version.json").then((r) => r.json());
  let checks = 0;
  await page.route("**/version.json", (route) =>
    route.fulfill({
      json: {
        ...current,
        buildId: ++checks === 1 ? current.buildId : "qa-next-release",
      },
    }),
  );
  return () => checks;
}

test("HTML e manifest senza cache, asset con nome univoco e cache lunga", async ({
  request,
}) => {
  for (const path of [
    "/",
    "/desideri",
    "/archivio",
    "/events/test",
    "/invite/test",
    "/index.html",
    "/version.json",
  ]) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()["cache-control"]).toBe("no-store");
  }
  const html = await request.get("/").then((r) => r.text());
  const script = html.match(/src="([^"]+\.js)"/)[1];
  const asset = await request.get(script);
  expect(asset.headers()["cache-control"]).toContain("immutable");
  const release = await request.get("/version.json").then((r) => r.json());
  expect(release.version).toBe("1.3.1");
  expect(await asset.text()).toContain(release.buildId);
});

test("una scheda mobile inattiva nelle modifiche carica automaticamente il nuovo rilascio", async ({
  page,
}) => {
  const email = `release-${Date.now()}@example.test`;
  const auth = await page.request
    .post("/api/auth/request", { data: { email, name: "Ada" } })
    .then((r) => r.json());
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: auth.devCode },
      })
    ).ok(),
  ).toBe(true);
  const checks = await simulateNextRelease(page);
  await page.goto("/?vista=gruppi#inizio");
  await expect(
    page.getByRole("navigation", { name: "Navigazione principale" }),
  ).toBeVisible();
  await expect.poll(checks).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page).toHaveURL(
    /vista=gruppi&__release=qa-next-release#inizio$/,
  );
  await expect(
    page.getByRole("navigation", { name: "Navigazione principale" }),
  ).toBeVisible();
  // The synthetic manifest keeps returning a newer ID: prevent a reload loop.
  await expect(
    page.getByRole("button", { name: "Aggiorna ora" }),
  ).toBeVisible();
  expect(checks()).toBeLessThanOrEqual(3);
});

test("il controllo di versione conserva i dati inseriti e propone un aggiornamento esplicito", async ({
  page,
}) => {
  const checks = await simulateNextRelease(page);
  await page.goto("/");
  await page.getByLabel("Come ti chiami?").fill("Appunti da conservare");
  await page.getByLabel("La tua email").fill("ada@example.test");
  await expect.poll(checks).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const update = page.getByRole("button", { name: "Aggiorna ora" });
  await expect(update).toBeVisible();
  await expect(page.getByLabel("Come ti chiami?")).toHaveValue(
    "Appunti da conservare",
  );
  await expect(page.getByLabel("La tua email")).toHaveValue("ada@example.test");
  await expect(page).not.toHaveURL(/__release/);
  await update.tap();
  await expect(page).toHaveURL(/__release=qa-next-release/);
});
