import { afterEach, expect, it } from "vitest";
import {
  clearGameMessages,
  gameT,
  getLocale,
  registerGameMessages,
  setLocale,
  t,
} from "../src/i18n.js";
import { date, money, statusLabel } from "../src/api.js";
import { gameGlossary } from "../worker/gameLanguage.js";

afterEach(async () => {
  clearGameMessages();
  await setLocale("it");
});

it("uses the quiz film title and the ordinary character name in their respective contexts", async () => {
  await setLocale("en");
  registerGameMessages(gameGlossary({ question: { options: ["Il Grinch"] } }));
  expect(gameT("Il Grinch")).toBe("How the Grinch Stole Christmas");
  expect(t("Il Grinch")).toBe("The Grinch");
  expect(gameT("Copia link")).toBe(t("Copia link"));
  clearGameMessages();
  expect(gameT("Il Grinch")).toBe("The Grinch");
});

it("uses Italian by default, validates the selection and formats EUR in the selected language", async () => {
  expect(getLocale()).toBe("it");
  await setLocale("de");
  expect(statusLabel("open")).toBe("Anmeldung offen");
  expect(date("2026-12-02T11:00:00Z")).toContain("Dezember");
  expect(money(25)).toContain("€");
  expect(money(19.75)).toContain("19,75");
  await setLocale("__proto__");
  expect(getLocale()).toBe("de");
});

it("inserts user values verbatim once, including when they contain placeholder syntax", async () => {
  await setLocale("en");
  expect(t("Test {name}", { name: "Ada {name}" })).toBe("Test Ada {name}");
});

it("returns translations exclusively for already visible game content", () => {
  const question = "Quale di questi è un dolce natalizio?";
  const output = gameGlossary({
    question: { title: question, options: ["Panettone"] },
    opponent: { name: "La Befana" },
  });
  expect(output[question][0]).toContain("Christmas");
  expect(output).not.toHaveProperty("La Befana");
  expect(output).not.toHaveProperty(
    "Chi riempie le calze il 6 gennaio nella tradizione italiana?",
  );
});
