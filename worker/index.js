import { HttpError, json } from "./security.js";
import { currentUser, authRoute } from "./auth.js";
import { eventRoute, inviteRoute, scheduled } from "./events.js";
import { stampRoute } from "./stamps.js";
import { practiceRoute } from "./practice.js";
import { competitionRoute } from "./competition.js";
import {
  avatarRoute,
  cleanRetiredAvatars,
  photoBackupRoute,
  profileRoute,
} from "./profile.js";
import { telegramWebhook } from "./telegram.js";
import { notificationRoute, runNotifications } from "./notifications.js";
import { amazonPreferencesRoute } from "./amazonPreferences.js";
import { profileActivityRoute } from "./profileActivity.js";
import { giftCatalogProfileRoute, giftCatalogRoute } from "./giftCatalog.js";
export default {
  async fetch(request, env) {
    const url = new URL(request.url),
      path = url.pathname;
    if (!path.startsWith("/api/")) {
      const response = await env.ASSETS.fetch(request);
      const result = new Response(response.body, response);
      if (result.headers.get("Content-Type")?.includes("text/html")) {
        result.headers.set("Cache-Control", "no-store");
        result.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
      }
      result.headers.set("X-Content-Type-Options", "nosniff");
      result.headers.set("Referrer-Policy", "same-origin");
      result.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' data: blob: https://cdn.shopify.com; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      );
      return result;
    }
    try {
      if (path === "/api/gifts/profile")
        return await giftCatalogProfileRoute(request);
      if (!["GET", "POST", "PUT"].includes(request.method))
        throw new HttpError("Metodo non disponibile.", 405);
      if (path === "/api/telegram/webhook")
        return await telegramWebhook(request, env);
      if (path === "/api/profile/photo-backup")
        return await photoBackupRoute(request, env);
      let body = {};
      if (request.method !== "GET") {
        const origin = request.headers.get("Origin");
        if (origin && origin !== url.origin)
          throw new HttpError("La richiesta arriva da un altro sito.", 403);
        if (!request.headers.get("Content-Type")?.includes("application/json"))
          throw new HttpError("La richiesta deve contenere dati JSON.", 415);
        const raw = await request.text();
        if (raw.length > 100000)
          throw new HttpError("La richiesta è troppo grande.", 413);
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          throw new HttpError("I dati inviati non sono leggibili.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new HttpError("I dati inviati devono essere un oggetto.");
      }
      const user = await currentUser(request, env);
      if (path === "/api/me" || path.startsWith("/api/auth/")) {
        if (
          (path === "/api/me" && request.method !== "GET") ||
          (path !== "/api/me" && request.method !== "POST")
        )
          throw new HttpError("Metodo non disponibile.", 405);
        return await authRoute(request, env, path, body, user);
      }
      if (path.startsWith("/api/invite/") && request.method === "GET")
        return await inviteRoute(env, path.split("/").pop(), user);
      if (!user) throw new HttpError("Accedi per continuare.", 401);
      if (path === "/api/gifts")
        return await giftCatalogRoute(request, env, user);
      if (path === "/api/preferences/amazon")
        return await amazonPreferencesRoute(request, env, body, user);
      if (path === "/api/profile/activity")
        return await profileActivityRoute(request, env, body, user);
      if (path === "/api/stamps")
        return await stampRoute(request.method, env.DB, user.id, body, env);
      if (path.startsWith("/api/practice/"))
        return await practiceRoute(request, env, path, body, user);
      if (path.startsWith("/api/competition/"))
        return await competitionRoute(request, env, path, body, user);
      if (path === "/api/profile" || path.startsWith("/api/profile/"))
        return await profileRoute(request, env, path, body, user);
      if (path.startsWith("/api/avatars/"))
        return await avatarRoute(request, env, user);
      if (path.startsWith("/api/notifications/"))
        return await notificationRoute(request, env, path, body, user);
      return await eventRoute(request, env, path, body, user);
    } catch (error) {
      if (!(error instanceof HttpError))
        console.error("API failure", error.message);
      return json(
        {
          error:
            error instanceof HttpError
              ? error.message
              : "Qualcosa non ha funzionato. Riprova tra poco.",
        },
        error.status || 500,
      );
    }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(scheduled(env).then(() => runNotifications(env)));
    ctx.waitUntil(cleanRetiredAvatars(env));
  },
};
