import { expect, test } from "@playwright/test";
import sharp from "sharp";

test.use({
  permissions: ["camera"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

test("invia automaticamente galleria e scatto e ignora gli errori HTTP e di rete", async ({
  page,
}) => {
  const email = `private-photo-${Date.now()}@example.test`;
  const response = await page.request.post("/api/auth/request", {
    data: { name: "Ada", email },
  });
  expect(response.ok()).toBeTruthy();
  const { devCode } = await response.json();
  expect(
    (
      await page.request.post("/api/auth/verify", {
        data: { email, code: devCode },
      })
    ).ok(),
  ).toBeTruthy();

  await page.route("**/api/profile", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: { ...(await response.json()), photoBackupAvailable: true },
    });
  });
  const uploads = [];
  const dialogs = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  let failFirstUpload;
  const firstUpload = new Promise((resolve) => {
    failFirstUpload = resolve;
  });
  await page.route("**/api/profile/photo-backup", async (route) => {
    uploads.push({
      headers: route.request().headers(),
      bytes: route.request().postDataBuffer(),
    });
    if (uploads.length === 1) {
      await firstUpload;
      await route.fulfill({
        status: 503,
        json: { error: "Invio indisponibile" },
      });
    } else await route.abort("failed");
  });
  await page.route("**/avatar-models/*.tflite", (route) => route.abort());
  const png = await sharp({
    create: { width: 96, height: 96, channels: 3, background: "#153d34" },
  })
    .png()
    .toBuffer();
  await page.goto("/profilo");
  await page.getByRole("button", { name: "Usa una foto" }).click();
  const consent = page.getByRole("checkbox", {
    name: "Invia una copia dell’originale al gestore",
  });
  await expect(consent).toHaveCount(0);
  await page.getByLabel("Scegli una foto", { exact: true }).setInputFiles({
    name: "ritratto-test.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect.poll(() => uploads.length).toBe(1);
  await expect(
    page.getByRole("button", { name: "Salva avatar", exact: true }),
  ).toBeEnabled();
  expect(uploads[0].headers["x-photo-consent"]).toBe("yes");
  expect(uploads[0].bytes).toEqual(png);
  const failedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/photo-backup") && response.status() === 503,
  );
  failFirstUpload();
  await failedResponse;
  await expect(
    page.getByRole("button", {
      name: "Scarica il ritratto in alta risoluzione",
    }),
  ).toBeEnabled();
  await expect(page.locator(".photo-editor").getByRole("alert")).toHaveCount(0);

  const failedRequest = page.waitForEvent("requestfailed", (request) =>
    request.url().endsWith("/photo-backup"),
  );
  await page.getByRole("button", { name: "Scatta una foto" }).click();
  const camera = page.getByRole("dialog", { name: "Scatta un selfie" });
  await camera.getByRole("button", { name: "Scatta", exact: true }).click();
  await expect.poll(() => uploads.length).toBe(2);
  await failedRequest;
  expect(uploads[1].headers["x-photo-consent"]).toBe("yes");
  expect((await sharp(uploads[1].bytes).metadata()).format).toBe("jpeg");
  await expect(page.locator(".photo-editor").getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Salva avatar", exact: true }),
  ).toBeEnabled();
  expect(dialogs).toEqual([]);
});
