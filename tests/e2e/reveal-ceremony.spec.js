import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

test("la neve si alza e il sigillo si apre prima di mostrare un solo destinatario", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const email = "admin@example.test";
  const code = await page.request.post("/api/auth/request", {
    data: { email, name: "Ada Anteprima" },
  });
  expect(code.ok()).toBeTruthy();
  const { devCode } = await code.json();
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: devCode },
      })
    ).ok(),
  ).toBeTruthy();
  const { user } = await page.request.get("/api/me").then((r) => r.json());
  expect(user.organizer).toBe(true);
  const afterDays = (days) =>
    new Date(Date.now() + days * 86_400_000).toISOString();
  const created = await page.request.post("/api/events", {
    data: {
      name: "Natale di prova · anteprima",
      description:
        "Evento locale con nomi fittizi per provare la busta e i giochi.",
      budget: 25,
      closeAt: afterDays(1),
      drawAt: afterDays(2),
      giftAt: afterDays(3),
      organizerParticipates: true,
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const { event } = await created.json();
  const path = `/api/events/${event.id}`;
  for (const name of ["Marta", "Luca", "Neve"]) {
    const prepared = await page.request.post(path + "/accounts", {
      data: { name, email: `${name.toLowerCase()}-anteprima@example.test` },
    });
    expect(prepared.ok(), await prepared.text()).toBeTruthy();
  }
  const { members } = await (await page.request.get(path)).json();
  const giverId = members.find((member) => member.userId === user.id).id;
  const receiverId = members.find((member) => member.name === "Marta").id;
  expect(
    (
      await page.request.put(path + "/rules", {
        data: { rules: [{ giverId, receiverId, type: "fixed" }] },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await page.request.post(path + "/draw", { data: {} })).ok(),
  ).toBeTruthy();

  await page.setViewportSize({ width: 740, height: 860 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let opened = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === path + "/recipient") opened++;
  });
  await page.goto(`/events/${event.id}`);
  await page.getByRole("button", { name: "Il nome segreto" }).click();
  const stage = page.locator(".reveal-stage");
  const seal = page.getByRole("button", {
    name: "Apri il sigillo e scopri il destinatario",
  });
  const name = stage.getByRole("heading", { name: "Marta", exact: true });
  const artifacts = process.env.ARTIFACT_DIR;
  if (artifacts) {
    mkdirSync(artifacts, { recursive: true });
    await stage.screenshot({
      path: join(artifacts, "rivelazione-sigillo.png"),
    });
    writeFileSync(
      join(artifacts, "evento-demo.txt"),
      `http://127.0.0.1:${new URL(page.url()).port}/events/${event.id}\n${email}\n`,
    );
  }
  expect(opened).toBe(0);
  await seal.focus();
  await seal.press("Enter");
  await expect(stage).toHaveClass(/opening/);
  await expect(name).toHaveCount(0);
  await expect(stage.locator(".envelope-card")).toHaveCSS(
    "animation-name",
    "ceremony-paper",
  );
  await expect(stage.locator(".ceremony-snow span").first()).toHaveCSS(
    "animation-name",
    "ceremony-snow",
  );
  await expect(name).toBeFocused();
  expect(opened).toBe(1);
  if (artifacts)
    await stage.screenshot({
      path: join(artifacts, "rivelazione-lettera.png"),
    });

  const replay = stage.getByRole("button", { name: "Riapri la lettera" });
  await replay.click();
  await expect(seal).toBeFocused();
  await expect(name).toHaveCount(0);
  expect(opened).toBe(1);
  await seal.click();
  await expect(stage).toHaveClass(/opening/);
  await stage.getByRole("button", { name: "Mostra subito il nome" }).click();
  await expect(name).toBeFocused();
  expect(opened).toBe(2);

  await replay.click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 720 });
  await seal.click();
  await expect(name).toBeFocused({ timeout: 1500 });
  await expect(stage.locator(".ceremony-snow")).toBeHidden();
  expect(opened).toBe(3);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  if (artifacts)
    await stage.screenshot({
      path: join(artifacts, "rivelazione-mobile-320.png"),
    });
});
