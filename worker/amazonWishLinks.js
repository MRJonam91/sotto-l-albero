import { amazonMarketplace } from "../shared/amazonLinks.js";
import {
  loadSiteAmazonTags,
  siteAmazonAffiliation,
} from "./amazonPreferences.js";

const shortHosts = new Set(["amzn.to", "amzn.eu", "amzn.asia", "a.co"]);

function amazonDestination(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.port) return null;
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:") return null;
    return amazonMarketplace(url) || shortHosts.has(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

async function expandAmazonLink(url, signal) {
  for (let hop = 0; hop < 4; hop++) {
    if (!shortHosts.has(url.hostname)) return url;
    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        signal,
      });
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location)
        return null;
      url = amazonDestination(new URL(location, url));
      if (!url) return null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function projectAmazonWishLinks(wishlist, db, env) {
  if (!siteAmazonAffiliation(env) || !Array.isArray(wishlist)) return wishlist;
  const candidates = new Map();
  for (const { url } of wishlist.filter(Boolean)) {
    const destination = amazonDestination(url);
    if (destination) candidates.set(url, destination);
  }
  if (!candidates.size) return wishlist;

  const tags = await loadSiteAmazonTags(db, env).catch(() => new Map());
  if (!tags.size) return wishlist;

  // Keep attribution a reversible presentation change and bound requests to
  // Amazon's own shorteners. The player's stored link remains the fallback.
  const links = new Map();
  const entries = [...candidates];
  const signal = AbortSignal.timeout(1800);
  for (let index = 0; index < entries.length; index += 4) {
    await Promise.all(
      entries.slice(index, index + 4).map(async ([original, url]) => {
        const destination = await expandAmazonLink(url, signal);
        const tag = destination && tags.get(amazonMarketplace(destination));
        if (tag) {
          destination.searchParams.set("tag", tag);
          links.set(original, destination.href);
        }
      }),
    );
  }
  return wishlist.map((item) =>
    links.has(item?.url)
      ? { ...item, url: links.get(item.url), siteAffiliate: true }
      : item,
  );
}
