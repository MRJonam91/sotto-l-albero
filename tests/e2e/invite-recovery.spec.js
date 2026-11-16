import { test, expect, request } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

async function login(client, email, name) {
  const requested = await client.post("/api/auth/request", {
    data: { email, name },
  });
  expect(requested.ok()).toBe(true);
  const { devCode } = await requested.json();
  const verified = await client.post("/api/auth/verify", {
    data: { email, code: devCode },
  });
  expect(verified.ok()).toBe(true);
  return (await verified.json()).user;
}

test("un account normale vede il comando per creare il proprio evento", async ({
  page,
}) => {
  const user = await login(
    page.request,
    `creator-ui-${Date.now()}@example.test`,
    "Nina",
  );
  expect(user.organizer).toBe(false);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Crea un Secret Santa", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Nome dello scambio")).toBeVisible();
});

test("invito riaperto dopo chiusura: accesso, elenco e lettera restano disponibili all’iscritto", async ({
  page,
  baseURL,
}) => {
  const owner = await request.newContext({ baseURL });
  const third = await request.newContext({ baseURL });
  try {
    const stamp = Date.now();
    await login(
      owner,
      `owner-recovery-${stamp}@example.test`,
      "Organizzatore recupero",
    );
    const participant = await login(
      page.request,
      `member-recovery-${stamp}@example.test`,
      "Partecipante recupero",
    );
    await login(
      third,
      `third-recovery-${stamp}@example.test`,
      "Terzo partecipante",
    );
    const dates = {
      closeAt: new Date(Date.now() + 86_400_000).toISOString(),
      drawAt: new Date(Date.now() + 172_800_000).toISOString(),
      giftAt: new Date(Date.now() + 864_000_000).toISOString(),
    };
    const created = await owner.post("/api/events", {
      data: {
        name: `Natale recuperabile ${stamp}`,
        budget: 20,
        organizerParticipates: true,
        ...dates,
      },
    });
    expect(created.ok()).toBe(true);
    const { event } = await created.json();
    const path = `/api/events/${event.id}`;
    const token = event.inviteToken;
    for (const client of [page.request, third])
      expect(
        (await client.post(path + "/join", { data: { token } })).ok(),
      ).toBe(true);
    const detail = await owner.get(path).then((r) => r.json());
    for (const member of detail.members)
      if (member.status === "pending")
        expect(
          (
            await owner.post(`${path}/members/${member.id}`, {
              data: { status: "approved" },
            })
          ).ok(),
        ).toBe(true);
    const current = await owner.get(path).then((r) => r.json());
    expect(
      (
        await owner.put(path, {
          data: {
            ...current.event,
            closeAt: new Date(Date.now() - 120_000).toISOString(),
            drawAt: new Date(Date.now() - 60_000).toISOString(),
          },
        })
      ).ok(),
    ).toBe(true);
    expect((await owner.post(path + "/draw", { data: {} })).ok()).toBe(true);

    await page.request.post("/api/auth/logout", { data: {} });
    await page.goto(`/invite/${token}`);
    await expect(
      page.getByText(
        "Le iscrizioni sono chiuse. Se hai già aderito, puoi ancora aprire l’evento.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Come ti chiami?")).toHaveCount(0);
    await page.getByLabel("La tua email").fill(participant.email);
    await page.getByRole("button", { name: "Ricevi il codice" }).click();
    const code = await page.locator(".local-code strong").textContent();
    await page.getByLabel("Codice di accesso").fill(code);
    await page.getByRole("button", { name: "Entra", exact: true }).click();
    await page
      .getByRole("button", { name: "Apri l’evento", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: event.name, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Il nome segreto", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Mostra subito il nome", exact: true })
      .click();
    await expect(page.locator(".recipient-letter h2")).toBeVisible();
    await page
      .getByRole("navigation", { name: "Navigazione principale" })
      .getByRole("button", { name: "I miei eventi", exact: true })
      .click();
    await expect(
      page
        .locator(".event-list")
        .getByRole("button", { name: new RegExp(event.name) }),
    ).toBeVisible();
    await page.goto(`/events/${event.id}?tab=reveal`);
    await expect(page.locator(".recipient-letter h2")).toBeVisible();
  } finally {
    await owner.dispose();
    await third.dispose();
  }
});
