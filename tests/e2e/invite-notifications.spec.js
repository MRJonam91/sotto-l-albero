import { test, expect } from "@playwright/test";

async function signIn(client, email, name) {
  const response = await client.post("/api/auth/request", {
    data: { email, name },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const { devCode } = await response.json();
  expect(devCode).toBeTruthy();
  const verified = await client.post("/api/auth/verify", {
    data: { email, code: devCode },
  });
  expect(verified.ok(), await verified.text()).toBeTruthy();
}

test("dopo l’adesione mostra le preferenze reali e propone Telegram senza attivarlo", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  await signIn(request, "admin@example.test", "Organizzatore");
  const created = await request.post("/api/events", {
    data: {
      name: `Invito con avvisi ${stamp}`,
      budget: 20,
      closeAt: new Date(Date.now() + 86400000).toISOString(),
      drawAt: new Date(Date.now() + 172800000).toISOString(),
      giftAt: new Date(Date.now() + 864000000).toISOString(),
      description: "Una festa tra amici.",
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const { event } = await created.json();
  const detail = await (await request.get(`/api/events/${event.id}`)).json();
  await signIn(page.request, `invite-hint-${stamp}@example.test`, "Ada");
  const profile = await (await page.request.get("/api/profile")).json();
  expect(profile.notifyEmail).toBe(true);
  expect(profile.notifyTelegram).toBe(false);
  const preferenceWrites = [];
  page.on("request", (req) => {
    if (
      new URL(req.url()).pathname === "/api/profile" &&
      req.method() === "PUT"
    )
      preferenceWrites.push(req.postData());
  });
  await page.route("**/api/profile", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: { ...(await response.json()), telegramAvailable: true },
    });
  });
  await page.goto(`/invite/${detail.event.inviteToken}`);
  await page
    .getByRole("button", { name: "Voglio partecipare", exact: true })
    .click();
  const hint = page.getByRole("status", { name: "Avvisi del gruppo" });
  await expect(hint).toBeVisible();
  await expect(hint).toContainText(
    "Gli avvisi via email sono attivati nelle tue preferenze.",
  );
  await expect(hint).toContainText("Telegram è facoltativo");
  expect(preferenceWrites).toEqual([]);
  await hint
    .getByRole("button", { name: "Configura gli avvisi", exact: true })
    .click();
  await expect(page).toHaveURL(/\/profilo#telegram$/);
  await expect(
    page.getByRole("checkbox", {
      name: "Ricevi gli avvisi degli scambi su Telegram",
    }),
  ).not.toBeChecked();
  expect(preferenceWrites).toEqual([]);
});
