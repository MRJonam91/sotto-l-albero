import { all, first, run, sendMail } from "./auth.js";
import {
  digest,
  escapeHtml,
  HttpError,
  id,
  json,
  safeText,
} from "./security.js";
import { telegramAvailable, telegramMessage } from "./telegram.js";

const hour = 3_600_000;
const day = 24 * hour;
const maxAttempts = 5;
const channels = "(SELECT 'email' AS channel UNION ALL SELECT 'telegram')";
const optedIn = `((c.channel='email' AND u.notify_email=1 AND ?=1)
  OR (c.channel='telegram' AND u.notify_telegram=1 AND u.telegram_chat_id IS NOT NULL AND ?=1))`;
const columns = `notification_jobs(event_id,user_id,channel,kind,source_key,payload,created_at,expires_at,next_at)`;
const dateLabels = {
  close_at: "Chiusura delle iscrizioni",
  draw_at: "Estrazione",
  gift_at: "Scambio dei regali",
};
const romeDate = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  dateStyle: "long",
  timeStyle: "short",
});
const romeClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  hourCycle: "h23",
});
const iso = (timestamp) => new Date(timestamp).toISOString();

function configured(env) {
  return [
    Number(!!(env.RESEND_API_KEY && env.MAIL_FROM)),
    Number(telegramAvailable(env)),
  ];
}

async function enqueue(db, job, enabled = [1, 1]) {
  const {
    eventId,
    kind,
    sourceKey,
    payload,
    createdAt,
    expiresAt,
    userId = null,
  } = job;
  const result = await run(
    db,
    `INSERT OR IGNORE INTO ${columns}
    SELECT m.event_id,u.id,c.channel,?,?,?,?,?,? FROM members m
    JOIN users u ON u.id=m.user_id CROSS JOIN ${channels} c
    WHERE m.event_id=? AND m.status='approved' AND (? IS NULL OR u.id=?) AND ${optedIn}`,
    kind,
    sourceKey,
    JSON.stringify(payload),
    createdAt,
    expiresAt,
    createdAt,
    eventId,
    userId,
    userId,
    ...enabled,
  );
  return result.meta.changes;
}

export async function notificationRoute(request, env, path, body, user) {
  if (!user?.id) throw new HttpError("Accedi per continuare.", 401);
  const eventId = /^\/api\/notifications\/([\w-]{1,64})\/announce$/.exec(
    path,
  )?.[1];
  if (!eventId) throw new HttpError("Questa azione non è disponibile.", 404);
  if (request.method !== "POST")
    throw new HttpError("Metodo non disponibile.", 405);
  const event = await first(
    env.DB,
    "SELECT owner_id,status FROM events WHERE id=?",
    eventId,
  );
  if (!event || event.owner_id !== user.id)
    throw new HttpError("Gli avvisi spettano a chi organizza l’evento.", 403);
  if (event.status === "archived")
    throw new HttpError("L’evento è in archivio.", 409);
  const message = safeText(body?.message, 1000, true);
  const now = Date.now();
  const requestId = body?.requestId;
  if (
    requestId !== undefined &&
    (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(requestId))
  ) {
    throw new HttpError("Riprova a inviare l’avviso.");
  }
  const sourceKey =
    requestId || (await digest(`${Math.floor(now / 60000)}:${message}`));
  const queued = await enqueue(
    env.DB,
    {
      eventId,
      kind: "announce",
      sourceKey,
      payload: { message },
      createdAt: now,
      expiresAt: now + day,
    },
    configured(env),
  );
  return json({ ok: true, queued });
}

async function enqueueDuels(db, now, enabled) {
  await run(
    db,
    `INSERT OR IGNORE INTO ${columns}
    SELECT d.event_id,u.id,c.channel,'duel',d.id,json_object('duelId',d.id),?,d.expires,?
    FROM competition_duels d JOIN events e ON e.id=d.event_id AND e.status!='archived'
    JOIN members m ON m.event_id=d.event_id AND m.user_id=d.receiver_id AND m.status='approved'
    JOIN users u ON u.id=m.user_id CROSS JOIN ${channels} c
    WHERE d.expires>? AND ${optedIn}`,
    now,
    now,
    now,
    ...enabled,
  );
}

async function enqueueDraws(db, now) {
  await run(
    db,
    `INSERT OR IGNORE INTO ${columns}
    SELECT e.id,u.id,'telegram','draw',CAST(e.version AS TEXT),json_object('version',e.version),?,?,?
    FROM events e JOIN assignments a ON a.event_id=e.id AND a.version=e.version
    JOIN members m ON m.id=a.giver_id AND m.event_id=e.id AND m.status='approved'
    JOIN users u ON u.id=m.user_id
    WHERE e.status='drawn' AND u.notify_telegram=1 AND u.telegram_chat_id IS NOT NULL
      AND EXISTS(SELECT 1 FROM audit d WHERE d.event_id=e.id AND d.action='draw' AND d.created_at>=?)`,
    now,
    now + 2 * day,
    now,
    iso(now - 2 * day),
  );
}

async function enqueueReminders(db, now, enabled) {
  for (const field of Object.keys(dateLabels)) {
    for (const [from, until] of [
      [now, now + hour],
      [now + hour, now + day],
    ]) {
      const state =
        field === "gift_at"
          ? "e.status IN ('open','drawn')"
          : "e.status='open'";
      await run(
        db,
        `INSERT OR IGNORE INTO ${columns}
        SELECT e.id,u.id,c.channel,'reminder',? || e.${field},json_object('field',?,'date',e.${field}),
          ?,?,? FROM events e JOIN members m ON m.event_id=e.id AND m.status='approved'
        JOIN users u ON u.id=m.user_id CROSS JOIN ${channels} c
        WHERE ${state} AND e.${field}>? AND e.${field}<=? AND ${optedIn}`,
        `${field}:${from === now ? "60m" : "24h"}:`,
        field,
        now,
        until,
        now,
        iso(from),
        iso(until),
        ...enabled,
      );
    }
  }
}

function calendar(now) {
  const parts = Object.fromEntries(
    romeClock
      .formatToParts(now)
      .map(({ type, value }) => [type, Number(value)]),
  );
  const today = Date.UTC(parts.year, parts.month - 1, parts.day);
  const weekday = (new Date(today).getUTCDay() + 6) % 7;
  return {
    year: parts.year,
    monday: iso(today - weekday * day).slice(0, 10),
    beforeMondayMorning: weekday === 0 && parts.hour < 9,
  };
}

const editionStart = (year) => `${year - 1}-12-31T23:00:00.000Z`;

async function enqueueWeekly(
  db,
  now,
  enabled,
  { year, monday, beforeMondayMorning },
) {
  if (beforeMondayMorning) return;
  await run(
    db,
    `INSERT OR IGNORE INTO ${columns}
    SELECT e.id,u.id,c.channel,'weekly',? || e.id,'{}',?,?,?
    FROM events e JOIN members m ON m.event_id=e.id AND m.status='approved'
    JOIN competition_entries ce ON ce.event_id=e.id AND ce.user_id=m.user_id
    JOIN users u ON u.id=m.user_id CROSS JOIN ${channels} c
    WHERE e.status IN ('open','drawn') AND e.gift_at>=? AND e.gift_at<? AND ${optedIn}
      AND NOT EXISTS (
        SELECT 1 FROM notification_jobs j
        WHERE j.event_id=e.id AND j.user_id=u.id AND j.channel=c.channel
          AND j.kind='weekly' AND j.source_key LIKE ?
      )
    ORDER BY e.gift_at,e.id`,
    `${monday}:`,
    now,
    now + day,
    now,
    editionStart(year),
    editionStart(year + 1),
    ...enabled,
    `${monday}:%`,
  );
}

async function enqueueChallenges(db, now, enabled, { year }) {
  // Official games open together for each event. Duels are queued individually.
  await run(
    db,
    `INSERT OR IGNORE INTO ${columns}
    SELECT e.id,u.id,c.channel,'challenge','open','{}',?,?,?
    FROM events e JOIN members m ON m.event_id=e.id AND m.status='approved'
    JOIN users u ON u.id=m.user_id CROSS JOIN ${channels} c
    WHERE e.status IN ('open','drawn') AND e.created_at>=? AND e.gift_at>=? AND e.gift_at<? AND ${optedIn}
      AND NOT EXISTS (
        SELECT 1 FROM notification_jobs j
        WHERE j.event_id=e.id AND j.user_id=u.id AND j.channel=c.channel AND j.kind='challenge'
      )`,
    now,
    now + day,
    now,
    iso(now - 7 * day),
    iso(now),
    editionStart(year + 1),
    ...enabled,
  );
}

async function eligibility(db, job) {
  return first(
    db,
    `SELECT e.*,u.email,u.notify_email,u.notify_telegram,u.telegram_chat_id,m.id AS member_id
    FROM events e JOIN members m ON m.event_id=e.id AND m.status='approved'
    JOIN users u ON u.id=m.user_id WHERE e.id=? AND u.id=?`,
    job.event_id,
    job.user_id,
  );
}

async function content(db, job, event, now) {
  const payload = JSON.parse(job.payload);
  switch (job.kind) {
    case "announce":
      if (event.status !== "archived")
        return {
          title: `Un avviso per ${event.name}`,
          message: payload.message,
        };
      break;
    case "reminder":
      if (
        dateLabels[payload.field] &&
        event[payload.field] === payload.date &&
        Date.parse(payload.date) > now &&
        (event.status === "open" ||
          (event.status === "drawn" && payload.field === "gift_at"))
      ) {
        const label = dateLabels[payload.field];
        return {
          title: `Promemoria per ${event.name}`,
          message: `${label} il ${romeDate.format(new Date(payload.date))} (ora italiana).`,
        };
      }
      break;
    case "weekly": {
      if (event.status === "archived") break;
      const { getLeaderboard } = await import("./competition.js");
      const rows = await getLeaderboard(db, event);
      const rank = rows.find((row) => row.userId === job.user_id);
      if (rank)
        return {
          title: `La classifica di ${event.name}`,
          message: `Questa settimana hai ${rank.score} ${rank.score === 1 ? "punto" : "punti"}. Sei al ${rank.rank}º posto su ${rows.length}.`,
        };
      break;
    }
    case "challenge":
      if (event.status !== "archived" && Date.parse(event.gift_at) >= now) {
        return {
          title: `Le sfide di ${event.name} sono aperte`,
          message: "Il quiz, il memory e le prove del gruppo ti aspettano.",
        };
      }
      break;
    case "duel": {
      if (event.status === "archived") break;
      const duel = await first(
        db,
        `SELECT u.name FROM competition_duels d JOIN users u ON u.id=d.sender_id
        JOIN members m ON m.event_id=d.event_id AND m.user_id=d.sender_id AND m.status='approved'
        WHERE d.id=? AND d.event_id=? AND d.receiver_id=? AND d.expires>?`,
        payload.duelId,
        event.id,
        job.user_id,
        now,
      );
      if (duel)
        return {
          title: `Un duello per ${event.name}`,
          message: `${duel.name} ti ha invitato a una sfida. Apri l’evento per giocare.`,
        };
      break;
    }
    case "draw": {
      if (
        job.channel !== "telegram" ||
        event.status !== "drawn" ||
        event.version !== payload.version
      )
        break;
      const recipient = await first(
        db,
        `SELECT u.name FROM assignments a
        JOIN members m ON m.id=a.receiver_id AND m.event_id=a.event_id AND m.status='approved'
        JOIN users u ON u.id=m.user_id WHERE a.event_id=? AND a.version=? AND a.giver_id=?`,
        event.id,
        event.version,
        event.member_id,
      );
      if (recipient)
        return {
          title: `La tua lettera per ${event.name}`,
          message: `Quest’anno prepari un regalo per ${recipient.name}. Tieni il nome per te.`,
        };
      break;
    }
  }
  return null;
}

function eventUrl(env, eventId) {
  try {
    const app = new URL(env.APP_URL);
    if (
      app.protocol !== "https:" &&
      !(env.LOCAL_DEV === "true" && app.protocol === "http:")
    )
      return "";
    return new URL(`/events/${encodeURIComponent(eventId)}`, app.origin).href;
  } catch {
    return "";
  }
}

async function deliver(env, job, now) {
  const event = await eligibility(env.DB, job);
  if (
    !event ||
    (job.channel === "email"
      ? !event.notify_email
      : !event.notify_telegram || !event.telegram_chat_id)
  )
    return false;
  const letter = await content(env.DB, job, event, now);
  if (!letter) return false;
  const link = eventUrl(env, event.id);
  if (job.channel === "email") {
    const message = escapeHtml(letter.message).replaceAll("\n", "<br>");
    const html = `<p>${message}</p>${link ? `<p><a href="${escapeHtml(link)}">Apri l’evento</a></p>` : ""}`;
    await sendMail(
      env,
      event.email,
      letter.title,
      html,
      `sotto-albero-notifica-${job.id}`,
    );
  } else {
    await telegramMessage(
      env,
      event.telegram_chat_id,
      `${letter.title}\n\n${letter.message}${link ? `\n\n${link}` : ""}`,
    );
  }
  return true;
}

async function sendQueued(env, now, enabled) {
  const db = env.DB;
  const due = await all(
    db,
    `SELECT id FROM notification_jobs
    WHERE expires_at>? AND attempts<? AND next_at<=?
      AND (state='queued' OR (state='sending' AND lease_until<=?))
      AND ((channel='email' AND ?=1) OR (channel='telegram' AND ?=1))
    ORDER BY CASE kind WHEN 'draw' THEN 0 WHEN 'reminder' THEN 1 ELSE 2 END,next_at,id LIMIT 5`,
    now,
    maxAttempts,
    now,
    now,
    ...enabled,
  );
  for (const row of due) {
    const claim = id();
    const job = await first(
      db,
      `UPDATE notification_jobs SET state='sending',claim=?,lease_until=?,attempts=attempts+1
      WHERE id=? AND expires_at>? AND attempts<? AND next_at<=?
        AND (state='queued' OR (state='sending' AND lease_until<=?)) RETURNING *`,
      claim,
      now + 2 * 60_000,
      row.id,
      now,
      maxAttempts,
      now,
      now,
    );
    if (!job) continue;
    let state;
    let nextAt = now;
    try {
      state = (await deliver(env, job, now)) ? "sent" : "skipped";
    } catch (error) {
      const retry = Math.max(
        60_000 * 5 ** (job.attempts - 1),
        (error.retryAfter || 0) * 1000,
      );
      nextAt = now + retry;
      state =
        error.permanent ||
        job.attempts >= maxAttempts ||
        nextAt >= job.expires_at
          ? "failed"
          : "queued";
    }
    await run(
      db,
      `UPDATE notification_jobs SET state=?,next_at=?,claim=NULL,lease_until=NULL WHERE id=? AND claim=?`,
      state,
      nextAt,
      job.id,
      claim,
    );
  }
}

export async function runNotifications(env, now = Date.now()) {
  const enabled = configured(env);
  if (enabled.some(Boolean)) {
    const edition = calendar(now);
    if (enabled[1]) await enqueueDraws(env.DB, now);
    await enqueueReminders(env.DB, now, enabled);
    await enqueueWeekly(env.DB, now, enabled, edition);
    await enqueueChallenges(env.DB, now, enabled, edition);
    await enqueueDuels(env.DB, now, enabled);
    await sendQueued(env, now, enabled);
  }
  await run(env.DB, "DELETE FROM telegram_links WHERE expires_at<?", now);
  await run(
    env.DB,
    "DELETE FROM media_upload_limits WHERE bucket<?",
    Math.floor(now / hour) - 1,
  );
  await run(
    env.DB,
    "DELETE FROM notification_jobs WHERE expires_at<?",
    now - 30 * day,
  );
}
