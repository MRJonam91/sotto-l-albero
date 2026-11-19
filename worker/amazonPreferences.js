import { first, run } from "./auth.js";
import { HttpError, json, safeText } from "./security.js";
import { validAmazonTag } from "../shared/amazonLinks.js";

function authorizedAmazonEmail(env) {
  return String(env?.AMAZON_AFFILIATE_EMAIL || "")
    .trim()
    .toLowerCase();
}

export function siteAmazonAffiliation(env) {
  return env?.AMAZON_AFFILIATE_SCOPE === "site";
}

export function amazonPreferencesAllowed(user, env) {
  const authorizedEmail = authorizedAmazonEmail(env);
  return (
    !!authorizedEmail &&
    String(user?.email || "")
      .trim()
      .toLowerCase() === authorizedEmail
  );
}

export async function loadAmazonPreferences(db, user, env) {
  if (!amazonPreferencesAllowed(user, env)) return { allowed: false };
  const preference = await first(
    db,
    "SELECT tag,enabled FROM amazon_preferences WHERE user_id=?",
    user.id,
  );
  return {
    allowed: true,
    tag: preference?.tag || "",
    enabled: preference?.enabled === 1,
    ...(siteAmazonAffiliation(env) ? { scope: "site" } : {}),
  };
}

export async function loadSiteAmazonTags(db, env) {
  const email = authorizedAmazonEmail(env);
  if (!siteAmazonAffiliation(env) || !email) return new Map();
  const preference = await first(
    db,
    "SELECT p.tag FROM amazon_preferences p JOIN users u ON u.id=p.user_id WHERE u.email=? AND p.enabled=1",
    email,
  );
  if (!validAmazonTag(preference?.tag)) return new Map();

  const tags = new Map([["amazon.it", preference.tag]]);
  try {
    const extraTags = JSON.parse(env.AMAZON_AFFILIATE_TAGS || "{}");
    for (const [marketplace, tag] of Object.entries(extraTags ?? {})) {
      if (marketplace !== "amazon.it" && validAmazonTag(tag))
        tags.set(marketplace, tag);
    }
  } catch {
    // A malformed optional mapping cannot invalidate the primary tracking ID.
  }
  return tags;
}

export async function amazonPreferencesRoute(request, env, body, user) {
  if (!user?.id) throw new HttpError("Accedi per continuare.", 401);
  if (request.method === "GET")
    return json(await loadAmazonPreferences(env.DB, user, env));
  if (request.method !== "PUT")
    throw new HttpError("Metodo non consentito.", 405);
  if (!amazonPreferencesAllowed(user, env))
    throw new HttpError(
      "Questa preferenza non è disponibile per il tuo account.",
      403,
    );
  const tag = safeText(body?.tag, 64);
  if (
    typeof body?.enabled !== "boolean" ||
    (tag && !validAmazonTag(tag)) ||
    (body.enabled && !tag)
  )
    throw new HttpError(
      "Inserisci un tracking ID Amazon valido prima di attivare l’opzione.",
    );
  await run(
    env.DB,
    "INSERT INTO amazon_preferences(user_id,tag,enabled,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET tag=excluded.tag,enabled=excluded.enabled,updated_at=excluded.updated_at",
    user.id,
    tag,
    Number(body.enabled),
    new Date().toISOString(),
  );
  return json({
    allowed: true,
    tag,
    enabled: body.enabled,
    ...(siteAmazonAffiliation(env) ? { scope: "site" } : {}),
  });
}
