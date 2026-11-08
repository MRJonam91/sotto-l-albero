import { defineConfig } from "@playwright/test";

const baseURL = process.env.QA_BASE_URL || "http://127.0.0.1:8790";
const target = new URL(baseURL);
if (
  target.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
  !target.port ||
  target.port === "8787"
) {
  throw new Error(
    "I test richiedono un’istanza locale isolata, su una porta diversa da 8787.",
  );
}

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL,
    headless: true,
  },
  reporter: "list",
});
