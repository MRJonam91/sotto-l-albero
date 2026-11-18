const amazonDomains = new Set(
  [
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
  ].flatMap((suffix) =>
    ["", "www.", "smile."].map((prefix) => `${prefix}amazon.${suffix}`),
  ),
);

export function validAmazonTag(value) {
  return (
    typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 64 &&
    /^[A-Za-z0-9][A-Za-z0-9-]*-[0-9]+$/.test(value)
  );
}

export function isAmazonUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      amazonDomains.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export function hasAmazonAffiliateTag(value) {
  return (
    isAmazonUrl(value) &&
    new URL(value).searchParams.getAll("tag").some(validAmazonTag)
  );
}

export function amazonWishlistLink(item, preferences = {}, previousItem) {
  const result = { url: item.url || "" };
  // Only a matching record from this user's stored wishlist proves that the
  // application managed this exact URL. Client metadata alone is not evidence.
  if (
    item.amazonAffiliate === false &&
    previousItem?.amazonAffiliate === true &&
    previousItem?.affiliate === true &&
    previousItem.url === item.url &&
    hasAmazonAffiliateTag(item.url)
  ) {
    const url = new URL(item.url);
    url.searchParams.delete("tag");
    return { url: url.href };
  }
  if (
    item.amazonAffiliate !== true ||
    preferences.allowed !== true ||
    preferences.enabled !== true ||
    !validAmazonTag(preferences.tag) ||
    !isAmazonUrl(item.url)
  )
    return result;
  const url = new URL(item.url);
  url.searchParams.set("tag", preferences.tag);
  return { url: url.href, amazonAffiliate: true, affiliate: true };
}

export function productSearchLinks(query, city = "") {
  const text = String(query || "").trim();
  return {
    amazon: `https://www.amazon.it/s?${new URLSearchParams({ k: text })}`,
    etsy: `https://www.etsy.com/it/search?${new URLSearchParams({ q: text })}`,
    toyscenter: `https://www.google.com/search?${new URLSearchParams({ q: `site:toyscenter.it ${text}` })}`,
    web: `https://www.google.com/search?${new URLSearchParams({ q: text })}`,
    local: `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: `${text} negozi ${String(city).trim()}` })}`,
  };
}
