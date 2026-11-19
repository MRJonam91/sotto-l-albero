import { supportsLocale } from "../shared/languages.js";
import { mailText } from "./mailText.js";
import {
  id,
  token,
  digest,
  validEmail,
  optionalPhone,
  safeText,
  HttpError,
  isLocalRequest,
  json,
  escapeHtml,
} from "./security.js";
import { parseHolidayProfile, romeToday } from "../shared/holidayPortrait.js";
export const first = (db, sql, ...args) =>
  db
    .prepare(sql)
    .bind(...args)
    .first();
export const all = async (db, sql, ...args) =>
  (
    await db
      .prepare(sql)
      .bind(...args)
      .all()
  ).results;
export const run = (db, sql, ...args) =>
  db
    .prepare(sql)
    .bind(...args)
    .run();
export async function sendMail(env, email, subject, html, key) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM)
    throw new HttpError(
      "L’invio email non è ancora configurato. Contatta chi gestisce il sito.",
      503,
    );
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [email], subject, html }),
  });
  if (!response.ok)
    throw new HttpError(
      "Non siamo riusciti a inviare l’email. Riprova tra poco.",
      503,
    );
}
export async function currentUser(request, env) {
  const raw = request.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)santa_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!raw) return null;
  const u = await first(
    env.DB,
    "SELECT u.*,av.kind AS avatar_kind,CASE WHEN av.kind='photo' THEN av.revision ELSE av.preset END AS avatar_value FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN user_avatars av ON av.user_id=u.id WHERE s.digest=? AND s.expires>?",
    await digest(raw),
    Date.now(),
  );
  if (!u) return null;
  return { ...u, organizer: !!u.organizer };
}
function publicUser(user) {
  if (!user) return null;
  const holidayProfile = parseHolidayProfile(user.holiday_profile);
  const today = romeToday();
  return {
    id: user.id,
    name: user.name,
    locale: user.locale,
    nickname: user.nickname || "",
    badge: user.badge || null,
    badgeText: user.badge_text || "nickname",
    holidayProfile,
    dailyCheckin: {
      today,
      pendingToday: holidayProfile.lastPromptDate !== today,
      lastPromptDate: holidayProfile.lastPromptDate,
      lastPromptStatus: holidayProfile.lastPromptStatus,
      skippedCount: holidayProfile.skippedDates.length,
      completedCount: holidayProfile.completedDates.length,
    },
    email: user.email,
    phone: user.phone,
    avatar: user.avatar_value
      ? { kind: user.avatar_kind, value: user.avatar_value }
      : null,
    organizer: !!user.organizer,
  };
}
export async function authRoute(
  request,
  env,
  path,
  body,
  user,
  { amazonAffiliation } = {},
) {
  const local = isLocalRequest(request, env);
  if (path === "/api/me")
    return json({
      user: publicUser(user),
      mailConfigured: !!(env.RESEND_API_KEY && env.MAIL_FROM),
      local,
      ...(amazonAffiliation ? { amazonAffiliation: true } : {}),
    });
  if (path === "/api/auth/logout") {
    const raw = request.headers
      .get("Cookie")
      ?.match(/santa_session=([a-f0-9]{64})/)?.[1];
    if (raw)
      await run(
        env.DB,
        "DELETE FROM sessions WHERE digest=?",
        await digest(raw),
      );
    return json({ ok: true }, 200, {
      "Set-Cookie": `santa_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${local ? "" : "; Secure"}`,
    });
  }
  const email = validEmail(body.email),
    now = Date.now();
  if (path === "/api/auth/request") {
    if (!local) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown",
        bucket = await digest(`${ip}:${Math.floor(now / 600000)}`);
      await run(
        env.DB,
        "INSERT INTO auth_limits(bucket,count,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1",
        bucket,
        now + 600000,
      );
      const limit = await first(
        env.DB,
        "SELECT count FROM auth_limits WHERE bucket=?",
        bucket,
      );
      if (limit.count > 20)
        throw new HttpError(
          "Sono stati richiesti molti codici da questa connessione. Riprova tra qualche minuto.",
          429,
        );
    }
    const previous = await first(
      env.DB,
      "SELECT requested FROM codes WHERE email=?",
      email,
    );
    if (previous && now - previous.requested < 30000)
      throw new HttpError(
        "Abbiamo appena inviato un codice. Aspetta mezzo minuto prima di richiederne un altro.",
        429,
      );
    if (!local && (!env.RESEND_API_KEY || !env.MAIL_FROM))
      throw new HttpError(
        "L’accesso via email deve ancora essere configurato.",
        503,
      );
    const existing = await first(
      env.DB,
      "SELECT name,locale FROM users WHERE email=?",
      email,
    );
    const name = existing?.name ?? safeText(body.name, 80, true);
    const phone = existing ? null : optionalPhone(body.phone);
    const bytes = crypto.getRandomValues(new Uint32Array(1));
    const code = String(bytes[0] % 1000000).padStart(6, "0");
    await run(
      env.DB,
      "INSERT INTO codes(email,digest,name,expires,attempts,requested,phone) VALUES(?,?,?,?,0,?,?) ON CONFLICT(email) DO UPDATE SET digest=excluded.digest,name=excluded.name,expires=excluded.expires,attempts=0,requested=excluded.requested,phone=excluded.phone",
      email,
      await digest(`${email}:${code}`),
      name,
      now + 600000,
      now,
      phone,
    );
    const locale = supportsLocale(body.locale)
      ? body.locale
      : existing?.locale || "it";
    if (!local)
      await sendMail(
        env,
        email,
        mailText(locale, "Il tuo codice per Sotto l’Albero"),
        `<p>${mailText(locale, "Il tuo codice è {code}.", { code: `<strong>${code}</strong>` })}</p><p>${mailText(locale, "Vale per dieci minuti. Se non l’hai richiesto tu, puoi ignorare questa email.")}</p>`,
      );
    return json({ ok: true, ...(local ? { devCode: code } : {}) });
  }
  if (path === "/api/auth/verify") {
    const entry = await first(
      env.DB,
      "SELECT * FROM codes WHERE email=?",
      email,
    );
    if (!entry || entry.expires < now || entry.attempts >= 5)
      throw new HttpError("Questo codice è scaduto. Richiedine uno nuovo.");
    await run(
      env.DB,
      "UPDATE codes SET attempts=attempts+1 WHERE email=?",
      email,
    );
    if ((await digest(`${email}:${String(body.code || "")}`)) !== entry.digest)
      throw new HttpError(
        "Il codice non corrisponde. Controlla le sei cifre nell’email.",
      );
    const admins = String(env.ADMIN_EMAILS || "")
      .toLowerCase()
      .split(/[\s,;]+/)
      .filter(Boolean);
    let u = await first(env.DB, "SELECT * FROM users WHERE email=?", email);
    const organizer =
      admins.includes(email) ||
      (local &&
        !(await first(
          env.DB,
          "SELECT id FROM users WHERE organizer=1 LIMIT 1",
        )));
    const session = token();
    const statements = [
      env.DB.prepare(
        "DELETE FROM codes WHERE email=? AND digest=? AND expires>? AND attempts<=5",
      ).bind(email, entry.digest, now),
    ];
    // Consume the OTP once; a second verifier must not be able to create a session.
    const consumed = await statements[0].run();
    if (consumed.meta.changes !== 1)
      throw new HttpError("Il codice è già stato usato. Richiedine uno nuovo.");
    if (!u) {
      await run(
        env.DB,
        "INSERT INTO users(id,email,name,organizer,phone,notify_email) VALUES(?,?,?,?,?,1) ON CONFLICT(email) DO NOTHING",
        id(),
        email,
        entry.name,
        organizer ? 1 : 0,
        entry.phone,
      );
    }
    if (supportsLocale(body.locale)) {
      await run(
        env.DB,
        "UPDATE users SET locale=? WHERE email=?",
        body.locale,
        email,
      );
    }
    if (organizer)
      await run(
        env.DB,
        "UPDATE users SET organizer=1 WHERE email=? AND organizer=0",
        email,
      );
    u = await first(
      env.DB,
      "SELECT u.*,av.kind AS avatar_kind,CASE WHEN av.kind='photo' THEN av.revision ELSE av.preset END AS avatar_value FROM users u LEFT JOIN user_avatars av ON av.user_id=u.id WHERE u.email=?",
      email,
    );
    await run(
      env.DB,
      "INSERT INTO sessions(digest,user_id,expires) VALUES(?,?,?)",
      await digest(session),
      u.id,
      now + 30 * 86400000,
    );
    return json({ user: publicUser(u) }, 200, {
      "Set-Cookie": `santa_session=${session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${local ? "" : "; Secure"}`,
    });
  }
  throw new HttpError("Questa pagina non esiste.", 404);
}
