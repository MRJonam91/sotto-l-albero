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
const registrationWindow = 15 * 60_000;
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

export function registrationNotice(env, eventId, userId, now) {
  const start = Math.floor(now / registrationWindow) * registrationWindow;
  const end = start + registrationWindow;
  return env.DB.prepare(
    `INSERT OR IGNORE INTO ${columns}
    SELECT e.id,u.id,'telegram','reminder',?,
      json_object('field','registration','from',?,'until',?),?,?,?
    FROM events e JOIN users u ON u.id=e.owner_id
    JOIN members m ON m.event_id=e.id AND m.user_id=?
    WHERE e.id=? AND e.status='open' AND u.id!=m.user_id
      AND m.status='pending' AND m.updated_at=?
      AND u.notify_telegram=1 AND u.telegram_chat_id IS NOT NULL AND ?=1`,
  ).bind(
    `registration:${start}`,
    iso(start),
    iso(end),
    now,
    end + day,
    end,
    userId,
    eventId,
    iso(now),
    Number(telegramAvailable(env)),
  );
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

async function enqueueDraws(db, now, enabled) {
  await run(
    db,
    `INSERT OR IGNORE INTO ${columns}
    SELECT e.id,u.id,c.channel,'draw',CAST(e.version AS TEXT),json_object('version',e.version),?,?,?
    FROM events e JOIN assignments a ON a.event_id=e.id AND a.version=e.version
    JOIN members m ON m.id=a.giver_id AND m.event_id=e.id AND m.status='approved'
    JOIN members receiver ON receiver.id=a.receiver_id AND receiver.event_id=e.id AND receiver.status='approved'
    JOIN users u ON u.id=m.user_id CROSS JOIN ${channels} c
    WHERE e.status='drawn' AND ${optedIn}
      AND (c.channel<>'email' OR NOT EXISTS(
        SELECT 1 FROM outbox o WHERE o.event_id=e.id AND o.version=e.version AND o.email=u.email
        AND (o.state IN ('sending','sent') OR (o.state='queued' AND o.attempts<5))
      ))`,
    now,
    now + 2 * day,
    now,
    ...enabled,
  );
}

async function enqueueReminders(db, now, enabled) {
  const [emailEnabled, telegramEnabled] = enabled;
  for (const field of Object.keys(dateLabels)) {
    const windows = [];
    if (emailEnabled)
      windows.push(
        ["email", now, now + hour, "60m"],
        ["email", now + hour, now + day, "24h"],
      );
    if (telegramEnabled) windows.push(["telegram", now, now + day, "24h"]);
    for (const [channel, from, until, window] of windows) {
      const state =
        field === "gift_at"
          ? "e.status IN ('open','drawn')"
          : "e.status='open'";
      const telegram = channel === "telegram";
      const recipients =
        telegram && field === "close_at"
          ? "JOIN users u ON u.id=e.owner_id"
          : "JOIN members m ON m.event_id=e.id AND m.status='approved' JOIN users u ON u.id=m.user_id";
      const optedIn = telegram
        ? `u.notify_telegram=1 AND u.telegram_chat_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM notification_jobs j WHERE j.event_id=e.id
             AND j.user_id=u.id AND j.channel='telegram' AND j.kind='reminder'
             AND j.source_key='${field}:60m:' || e.${field} AND j.state='sent')`
        : "u.notify_email=1";
      await run(
        db,
        `INSERT OR IGNORE INTO ${columns}
        SELECT e.id,u.id,?,'reminder',? || e.${field},
          json_object('field',?,'date',e.${field}),?,?,?
        FROM events e ${recipients}
        WHERE ${state} AND e.${field}>? AND e.${field}<=? AND ${optedIn}`,
        channel,
        `${field}:${window}:`,
        field,
        now,
        until,
        now,
        iso(from),
        iso(until),
      );
    }
  }
}

async function enqueueWelcome(db, now) {
  await run(
    db,
    `INSERT OR IGNORE INTO ${columns}
    SELECT e.id,u.id,'telegram','reminder','welcome',json_object('field','welcome'),?,?,?
    FROM events e JOIN users u ON u.id=e.owner_id
    WHERE e.status='open' AND trim(e.description)='' AND e.close_at>?
      AND e.created_at BETWEEN ? AND ?
      AND u.notify_telegram=1 AND u.telegram_chat_id IS NOT NULL`,
    now,
    now + day,
    now,
    iso(now + day),
    iso(now - 7 * day),
    iso(now - hour),
  );
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
    JOIN users u ON u.id=m.user_id CROSS JOIN ${channels} c
    WHERE e.status IN ('open','drawn') AND e.gift_at>=? AND e.gift_at<? AND ${optedIn}
      AND (
        EXISTS(SELECT 1 FROM competition_entries ce WHERE ce.event_id=e.id AND ce.user_id=u.id)
        OR EXISTS(
          SELECT 1 FROM competition_attempts a
          WHERE a.event_id=e.id AND a.user_id=u.id AND a.duel_id='' AND a.raw_score IS NOT NULL
        )
      )
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
  // Game announcements are email-only. Telegram duels are queued individually.
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
    enabled[0],
    0,
  );
}

async function eligibility(db, job) {
  return first(
    db,
    `SELECT e.*,u.email,u.notify_email,u.notify_telegram,u.telegram_chat_id
    FROM events e JOIN users u ON u.id=?
    WHERE e.id=? AND (
      EXISTS(SELECT 1 FROM members m WHERE m.event_id=e.id AND m.user_id=u.id AND m.status='approved')
      OR (e.owner_id=u.id AND ?='telegram' AND ?='reminder')
    )`,
    job.user_id,
    job.event_id,
    job.channel,
    job.kind,
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
      if (job.channel === "telegram") {
        if (job.source_key.includes(":60m:")) break; // Skip old duplicate jobs.
        if (["registration", "welcome", "close_at"].includes(payload.field)) {
          if (event.owner_id !== job.user_id || event.status !== "open") break;
          if (payload.field === "registration") {
            const requests = await all(
              db,
              `SELECT u.name, EXISTS(
                SELECT 1 FROM invites i WHERE i.event_id=m.event_id AND i.email=u.email AND i.state!='revoked'
              ) AS invited FROM members m JOIN users u ON u.id=m.user_id
              WHERE m.event_id=? AND m.status='pending' AND m.user_id!=?
                AND m.updated_at>=? AND m.updated_at<?
              ORDER BY m.updated_at,m.id`,
              event.id,
              job.user_id,
              payload.from,
              payload.until,
            );
            if (!requests.length) break;
            const lines = requests
              .slice(0, 8)
              .map(({ name, invited }) =>
                invited
                  ? `${name} ha accettato l’invito.`
                  : `${name} chiede di partecipare.`,
              );
            if (requests.length > 8)
              lines.push(`Altre richieste da leggere: ${requests.length - 8}.`);
            return {
              title: `Iscrizioni a ${event.name}`,
              message: [
                ...lines,
                "",
                "Apri l’elenco per confermare le richieste.",
              ].join("\n"),
              section: "event-members",
            };
          }
          if (payload.field === "welcome") {
            if (
              event.description.trim() ||
              Date.parse(event.close_at) <= now + day
            )
              break;
            return {
              title: `Dai il benvenuto a chi partecipa a ${event.name}`,
              message:
                "Aggiungi due righe per accogliere il gruppo o spiegare come vi scambierete i regali.",
              section: "event-settings",
            };
          }
          if (
            event.close_at !== payload.date ||
            Date.parse(payload.date) <= now
          )
            break;
          return {
            title: `Le iscrizioni per ${event.name} chiudono a breve`,
            message: `Il termine è il ${romeDate.format(new Date(payload.date))} (ora italiana). Controlla le richieste in attesa e verifica date e budget.${event.description.trim() ? "" : " Puoi ancora aggiungere un messaggio di benvenuto."}`,
            section: "event-settings",
          };
        }
      }
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
      if (
        job.channel === "email" &&
        event.status !== "archived" &&
        Date.parse(event.gift_at) >= now
      ) {
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
      if (event.status !== "drawn" || event.version !== payload.version) break;
      if (
        !(await first(
          db,
          `SELECT 1 FROM assignments a
        JOIN members giver ON giver.id=a.giver_id AND giver.event_id=a.event_id AND giver.status='approved'
        JOIN members receiver ON receiver.id=a.receiver_id AND receiver.event_id=a.event_id AND receiver.status='approved'
        WHERE a.event_id=? AND a.version=? AND giver.user_id=?`,
          event.id,
          event.version,
          job.user_id,
        ))
      )
        break;
      return {
        title: `La tua lettera per ${event.name}`,
        message:
          "I nomi sono stati estratti. Apri la tua lettera per scoprire in privato a chi farai il regalo.",
        tab: "reveal",
        linkLabel: "Apri la tua lettera",
      };
    }
  }
  return null;
}

function eventUrl(env, eventId, section, tab) {
  try {
    const app = new URL(env.APP_URL);
    if (
      app.protocol !== "https:" &&
      !(env.LOCAL_DEV === "true" && app.protocol === "http:")
    )
      return "";
    const url = new URL(`/events/${encodeURIComponent(eventId)}`, app.origin);
    if (tab) url.searchParams.set("tab", tab);
    if (section) {
      url.searchParams.set("tab", "admin");
      url.hash = section;
    }
    return url.href;
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
  const link = eventUrl(env, event.id, letter.section, letter.tab);
  const current = await eligibility(env.DB, job);
  if (
    !current ||
    current.status !== event.status ||
    current.version !== event.version ||
    (job.channel === "email"
      ? !current.notify_email || current.email !== event.email
      : !current.notify_telegram ||
        current.telegram_chat_id !== event.telegram_chat_id)
  )
    return false;
  if (job.channel === "email") {
    const message = escapeHtml(letter.message).replaceAll("\n", "<br>");
    const html = `<p>${message}</p>${link ? `<p><a href="${escapeHtml(link)}">${escapeHtml(letter.linkLabel || "Apri l’evento")}</a></p>` : ""}`;
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
    await enqueueDraws(env.DB, now, enabled);
    if (enabled[1]) {
      await enqueueWelcome(env.DB, now);
    }
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
    // Draw rows also remember delivery per event/version/channel. Retain them
    // so catching up ready letters cannot resend one after queue cleanup.
    "DELETE FROM notification_jobs WHERE expires_at<? AND kind!='draw'",
    now - 30 * day,
  );
}
