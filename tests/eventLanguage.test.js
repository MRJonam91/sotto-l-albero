import { afterEach, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { setLocale, t } from "../src/i18n.js";
import { GiftProductCard } from "../src/GiftBrowser.jsx";
import { Wish } from "../src/Reveal.jsx";
import eventMessages from "../src/locales/event.js";

afterEach(() => setLocale("it"));

it("preserves every named value across the six event translations", () => {
  const placeholders = (message) => (message.match(/\{\w+\}/g) || []).sort();
  for (const [source, ...translations] of eventMessages) {
    expect(translations, source).toHaveLength(5);
    for (const translation of translations) {
      expect(translation.trim(), source).not.toBe("");
      expect(placeholders(translation), source).toEqual(placeholders(source));
    }
  }
});

it.each([
  ["it", "Mi dai un aiuto?", "Aggiungi Il tuo indizio alla lettera"],
  ["en", "Give me a hint", "Add Il tuo indizio to your letter"],
  ["fr", "Un petit indice ?", "Ajouter Il tuo indizio à ta lettre"],
  ["de", "Gib mir einen Tipp", "Il tuo indizio auf deinen Wunschzettel setzen"],
  ["es", "¿Me das una pista?", "Añadir Il tuo indizio a tu carta"],
  ["pt", "Dás-me uma pista?", "Adicionar Il tuo indizio à tua carta"],
])(
  "renders wishes and product actions in %s while preserving names and letters",
  async (locale, hint, add) => {
    await setLocale(locale);
    const title = "Il tuo indizio";
    const wishlist = renderToStaticMarkup(
      createElement(Wish, {
        item: {
          type: "riddle",
          title,
          description: "La mia lettera",
          hint: "Un indizio privato",
          answer: "Una risposta privata",
        },
      }),
    );
    expect(wishlist).toContain(`<h3>${title}</h3>`);
    expect(wishlist).toContain("<p>La mia lettera</p>");
    expect(wishlist).toContain(hint);
    expect(wishlist).not.toContain("Una risposta privata");
    expect(wishlist).not.toContain("Un indizio privato");

    const product = renderToStaticMarkup(
      createElement(GiftProductCard, {
        product: {
          title,
          url: "https://shop.example/item",
          merchant: "La mia lettera",
          image: "https://shop.example/pic",
          price: 12.9,
        },
      }),
    );
    expect(product).toContain(`aria-label="${add}"`);
    expect(product).toContain(`<h4>${title}</h4>`);
    expect(product).toContain(t("Vedi nel negozio"));
  },
);
