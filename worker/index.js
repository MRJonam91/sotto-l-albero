import { HttpError, json } from "./security.js";
import { currentUser, authRoute } from "./auth.js";
import { eventRoute, inviteRoute, scheduled } from "./events.js";
export default {
  async fetch(request, env) {
    const url = new URL(request.url),
      path = url.pathname;
    if (!path.startsWith("/api/")) {
      const response = await env.ASSETS.fetch(request);
      const result = new Response(response.body, response);
      result.headers.set("X-Content-Type-Options", "nosniff");
      result.headers.set("Referrer-Policy", "same-origin");
      result.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      );
      return result;
    }
    try {
      if (!["GET", "POST", "PUT"].includes(request.method))
        throw new HttpError("Metodo non disponibile.", 405);
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
        return await inviteRoute(env, path.split("/").pop());
      if (!user) throw new HttpError("Accedi per continuare.", 401);
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
    ctx.waitUntil(scheduled(env));
  },
};
