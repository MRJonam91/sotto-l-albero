import { useSyncExternalStore } from "react";
import {
  languages,
  localeCodes,
  supportsLocale,
  interpolate,
} from "../shared/languages.js";
import catalogs from "virtual:language-catalogs";

export { languages };
const listeners = new Set();
const storageKey = "sotto-albero.language";
let locale = "it";
let dictionary = new Map();
let gameMessages = new Map();
let selection = 0;
const initialSnapshot = { locale: "it" };
let snapshot = initialSnapshot;

function notify() {
  snapshot = { locale };
  listeners.forEach((fn) => fn());
}
if (import.meta.hot && typeof window !== "undefined") {
  window.addEventListener("language-catalog-updated", notify);
  import.meta.hot.dispose(() =>
    window.removeEventListener("language-catalog-updated", notify),
  );
}

export const getLocale = () => locale;
export function useLocale() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => initialSnapshot,
  ).locale;
}
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export { subscribe as subscribeLocale };

export function registerGameMessages(messages) {
  for (const [key, translations] of Object.entries(messages || {})) {
    if (Array.isArray(translations) && translations.length === 5)
      gameMessages.set(key, translations);
  }
}
export function clearGameMessages() {
  gameMessages.clear();
}

export function t(source, values) {
  if (typeof source !== "string") return source;
  if (
    locale !== "it" &&
    !values &&
    source.startsWith("Il testo può contenere al massimo ")
  ) {
    const limit = /^Il testo può contenere al massimo (\d+) caratteri\.$/.exec(
      source,
    );
    if (limit)
      return t("Il testo può contenere al massimo {max} caratteri.", {
        max: limit[1],
      });
  }
  const translated =
    locale === "it"
      ? source
      : (dictionary.get(source) ??
        gameMessages.get(source)?.[localeCodes.indexOf(locale) - 1] ??
        source);
  return interpolate(translated, values);
}

// A quiz may use a film's official title where the UI names its character.
export function gameT(source, values) {
  const translation =
    locale !== "it" && typeof source === "string"
      ? gameMessages.get(source)?.[localeCodes.indexOf(locale) - 1]
      : undefined;
  return translation == null
    ? t(source, values)
    : interpolate(translation, values);
}

export async function setLocale(next) {
  if (!supportsLocale(next)) return;
  const requestId = ++selection;
  if (next !== locale) {
    const nextDictionary = next === "it" ? new Map() : await catalogs[next]();
    if (requestId !== selection) return;
    locale = next;
    dictionary = nextDictionary;
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
    document.title = t("Sotto l’Albero · Il tuo Secret Santa");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        t(
          "Organizza il Secret Santa del tuo gruppo. Inviti, desideri e un nome da tenere segreto fino a Natale.",
        ),
      );
  }
  try {
    globalThis.localStorage?.setItem(storageKey, locale);
  } catch {
    /* Storage may be disabled. */
  }
  notify();
}

export async function restoreLocale() {
  let saved;
  try {
    saved = globalThis.localStorage?.getItem(storageKey);
  } catch {
    /* Storage may be disabled. */
  }
  if (saved && supportsLocale(saved)) await setLocale(saved);
}
