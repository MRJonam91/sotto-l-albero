import { describe, expect, it } from "vitest";
import * as links from "../shared/amazonLinks.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Wish } from "../src/Reveal.jsx";

describe("Amazon wishlist links", () => {
  it("builds encoded external searches without applying a tracking tag", () => {
    const search = links.productSearchLinks("tazza blu & tè");
    expect(new URL(search.amazon).searchParams.get("k")).toBe("tazza blu & tè");
    expect(new URL(search.web).searchParams.get("q")).toBe("tazza blu & tè");
    expect(new URL(search.amazon).searchParams.has("tag")).toBe(false);
    expect(new URL(search.etsy).hostname).toBe("www.etsy.com");
    expect(new URL(search.etsy).searchParams.get("q")).toBe("tazza blu & tè");
    expect(new URL(search.toyscenter).searchParams.get("q")).toBe(
      "site:toyscenter.it tazza blu & tè",
    );
    const local = links.productSearchLinks("giochi", "Torino").local;
    expect(new URL(local).searchParams.get("query")).toBe(
      "giochi negozi Torino",
    );
  });
  it("accepts only exact supported HTTPS Amazon hosts", () => {
    for (const domain of [
      "it",
      "com",
      "co.uk",
      "de",
      "fr",
      "es",
      "nl",
      "pl",
      "se",
      "com.be",
      "ie",
    ])
      for (const prefix of ["", "www.", "smile."])
        expect(
          links.isAmazonUrl(`https://${prefix}amazon.${domain}/dp/ABC`),
        ).toBe(true);
    for (const url of [
      "http://amazon.it/dp/ABC",
      "https://amazon.it.evil.test/dp/A",
      "https://evil.amazon.it/dp/A",
      "https://amazon.it@evil.test/dp/A",
      "https://user@amazon.it/dp/A",
      "https://amazon.it:444/dp/A",
      "https://amzn.to/example",
      "javascript:alert(1)",
    ])
      expect(links.isAmazonUrl(url)).toBe(false);
  });
  it("validates conservative tracking IDs", () => {
    for (const tag of ["my-tag-21", "abc-20", "A1-21"])
      expect(links.validAmazonTag(tag)).toBe(true);
    for (const tag of [
      "",
      "a-",
      "bad tag-21",
      "bad&tag-21",
      "tag",
      "a".repeat(65) + "-21",
    ])
      expect(links.validAmazonTag(tag)).toBe(false);
  });
  it("applies only the saved tag after explicit item opt-in and recomputes metadata", () => {
    const prefs = { allowed: true, enabled: true, tag: "saved-21" };
    const result = links.amazonWishlistLink(
      {
        url: "https://www.amazon.it/dp/ABC?tag=forged-99&ref=x",
        amazonAffiliate: true,
        affiliate: false,
        tag: "forged-20",
      },
      prefs,
    );
    expect(new URL(result.url).searchParams.getAll("tag")).toEqual([
      "saved-21",
    ]);
    expect(new URL(result.url).searchParams.get("ref")).toBe("x");
    expect(result).toMatchObject({ affiliate: true, amazonAffiliate: true });
  });
  it("preserves links and drops forged affiliation flags without authorization or item opt-in", () => {
    const item = {
      url: "https://amazon.it/dp/ABC?tag=manual-21",
      amazonAffiliate: true,
      affiliate: true,
    };
    for (const prefs of [
      { allowed: false, enabled: true, tag: "saved-21" },
      { allowed: true, enabled: false, tag: "saved-21" },
      { allowed: true, enabled: true, tag: "invalid" },
    ])
      expect(links.amazonWishlistLink(item, prefs)).toEqual({ url: item.url });
    expect(
      links.amazonWishlistLink(
        { ...item, amazonAffiliate: false },
        { allowed: true, enabled: true, tag: "saved-21" },
      ),
    ).toEqual({ url: item.url });
    for (const url of [
      "https://example.com/gift",
      "https://amzn.to/abc",
      "http://amazon.it/dp/A",
    ])
      expect(
        links.amazonWishlistLink(
          { url, amazonAffiliate: true },
          { allowed: true, enabled: true, tag: "saved-21" },
        ),
      ).toEqual({ url });
  });
  it("shows pickup text safely and discloses actual tagged Amazon links to the giver", () => {
    const markup = renderToStaticMarkup(
      createElement(Wish, {
        item: {
          type: "object",
          title: "Gioco",
          url: "https://amazon.it/dp/ABC?tag=manual-21",
          fulfillment: "pickup",
          pickupCity: "Torino <script>alert(1)</script>",
        },
      }),
    );
    expect(markup).toContain("Apri su Amazon");
    expect(markup).toContain('aria-describedby="amazon-external-information"');
    expect(markup).not.toContain("Link affiliato Amazon");
    expect(markup).toContain('rel="sponsored noopener noreferrer"');
    expect(markup).toContain(
      "Ritiro a Torino &lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(markup).not.toContain("<script>");
  });
  it("does not label another shop as affiliated based on forged metadata", () => {
    const markup = renderToStaticMarkup(
      createElement(Wish, {
        item: {
          type: "object",
          title: "Artigianato",
          url: "https://www.etsy.com/listing/example",
          affiliate: true,
        },
      }),
    );
    expect(markup).not.toContain("Link affiliato Amazon");
    expect(markup).not.toContain("sponsored");
    expect(markup).toContain("https://www.etsy.com/listing/example");
  });
});
