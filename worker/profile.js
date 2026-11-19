import { all, currentUser, first, run } from "./auth.js";
import {
  HttpError,
  id,
  isLocalRequest,
  json,
  safeText,
  optionalPhone,
} from "./security.js";
import { badgeTextModes, holidayBadgeIds } from "../shared/badges.js";
import {
  computeHolidayPortrait,
  holidayMoods,
  parseHolidayProfile,
  romeToday,
} from "../shared/holidayPortrait.js";
import { loadHolidayActivities } from "./holidayActivity.js";
import {
  createTelegramLink,
  disconnectTelegram,
  photoBackupConfigured,
  readBoundedBytes,
  sendPhotoBackup,
  telegramAvailable,
} from "./telegram.js";

const avatarLimit = 64 * 1024;
const photoBackupLimit = 25 * 1024 * 1024;
const hour = 3_600_000;
const presets = new Set([
  "elf",
  "santa",
  "reindeer",
  "sleigh",
  "chimney",
  "snowglobe",
  "snowman",
  "gingerbread",
]);

const at = (bytes, start, signature) =>
  signature.every((value, i) => bytes[start + i] === value);
const ascii = (bytes, start, count) =>
  String.fromCharCode(...bytes.subarray(start, start + count));

function sniffImage(bytes) {
  if (at(bytes, 0, [255, 216, 255])) return "image/jpeg";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP")
    return "image/webp";
  return null;
}

function jpegSize(bytes) {
  for (let start = 2; start + 3 < bytes.length;) {
    if (bytes[start++] !== 255) return null;
    while (bytes[start] === 255) start++;
    const marker = bytes[start++];
    if (marker === 218 || marker === 217 || start + 1 >= bytes.length)
      return null;
    const length = bytes[start] * 256 + bytes[start + 1];
    if (length < 2 || start + length > bytes.length) return null;
    if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker)) {
      if (length < 8) return null;
      return [
        bytes[start + 5] * 256 + bytes[start + 6],
        bytes[start + 3] * 256 + bytes[start + 4],
      ];
    }
    start += length;
  }
  return null;
}

function webpSize(bytes) {
  const read16 = (offset) => bytes[offset] + bytes[offset + 1] * 256;
  const read24 = (offset) => read16(offset) + bytes[offset + 2] * 65536;
  const read32 = (offset) => read24(offset) + bytes[offset + 3] * 16777216;
  const end = read32(4) + 8;
  if (end !== bytes.length) return null;
  let canvas;
  for (let chunk = 12; chunk + 8 <= end;) {
    const name = ascii(bytes, chunk, 4);
    const size = read32(chunk + 4);
    const frame = chunk + 8;
    if (frame + size > end) return null;
    let dimensions;
    if (name === "VP8X") {
      if (size !== 10 || bytes[frame] & 2) return null;
      canvas = [read24(frame + 4) + 1, read24(frame + 7) + 1];
    } else if (
      name === "VP8 " &&
      size >= 10 &&
      at(bytes, frame + 3, [157, 1, 42])
    ) {
      dimensions = [read16(frame + 6) & 0x3fff, read16(frame + 8) & 0x3fff];
    } else if (name === "VP8L" && size >= 5 && bytes[frame] === 47) {
      const packed = read32(frame + 1);
      dimensions = [(packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1];
    } else if (name === "ANIM" || name === "ANMF") return null;
    if (dimensions) {
      if (
        canvas &&
        (canvas[0] !== dimensions[0] || canvas[1] !== dimensions[1])
      )
        return null;
      return dimensions;
    }
    chunk = frame + size + (size % 2);
  }
  return null;
}

function avatarImage(bytes) {
  const mime = sniffImage(bytes);
  const size =
    mime === "image/jpeg"
      ? jpegSize(bytes)
      : mime === "image/webp"
        ? webpSize(bytes)
        : null;
  if (size?.[0] !== 256 || size?.[1] !== 256)
    throw new HttpError(
      "L’avatar deve essere un JPEG o WebP quadrato di 256 pixel.",
      415,
    );
  return mime;
}

function isAnimatedWebp(bytes) {
  if (bytes.length < 30 || ascii(bytes, 12, 4) !== "VP8X" || !(bytes[20] & 2))
    return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(4, true) + 8 !== bytes.length ||
    view.getUint32(16, true) !== 10
  )
    return false;
  let animationHeader = false;
  let frame = false;
  for (let offset = 30; offset < bytes.length;) {
    if (offset + 8 > bytes.length) return false;
    const name = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    offset += 8 + size + (size % 2);
    if (offset > bytes.length) return false;
    if (name === "ANIM" && size === 6) animationHeader = true;
    if (name === "ANMF" && animationHeader && size > 24) frame = true;
  }
  return frame;
}

function validOriginalImage(bytes, mime) {
  if (mime === "image/png") {
    if (
      bytes.length < 45 ||
      !at(
        bytes,
        0,
        [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82],
      )
    )
      return false;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return (
      view.getUint32(16) > 0 &&
      view.getUint32(20) > 0 &&
      at(
        bytes,
        bytes.length - 12,
        [0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130],
      )
    );
  }
  if (sniffImage(bytes) !== mime) return false;
  if (mime === "image/jpeg") {
    let hasEoi = false;
    for (let i = Math.max(2, bytes.length - 1024); i < bytes.length - 1; i++) {
      if (bytes[i] === 255 && bytes[i + 1] === 217) {
        hasEoi = true;
        break;
      }
    }
    return (
      (jpegSize(bytes)?.every((size) => size > 0) || hasEoi) &&
      (at(bytes, bytes.length - 2, [255, 217]) || hasEoi)
    );
  }
  return webpSize(bytes)?.every((size) => size > 0) || isAnimatedWebp(bytes);
}

function decodeAvatar(value) {
  if (typeof value !== "string")
    throw new HttpError("Scegli una foto per il tuo avatar.");
  if (value.length > Math.ceil(avatarLimit / 3) * 4 + 30)
    throw new HttpError("L’avatar supera i 64 KiB.", 413);
  const match =
    /^data:(image\/(?:jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new HttpError("Usa un’immagine JPEG o WebP.", 415);
  let bytes;
  try {
    bytes = Uint8Array.from(atob(match[2]), (character) =>
      character.charCodeAt(0),
    );
  } catch {
    throw new HttpError("La foto non si legge. Riprova con un’altra immagine.");
  }
  if (bytes.byteLength > avatarLimit)
    throw new HttpError("L’avatar supera i 64 KiB.", 413);
  const mime = avatarImage(bytes);
  if (mime !== match[1])
    throw new HttpError("Il formato della foto non corrisponde.", 415);
  return { bytes, mime };
}

async function uploadPermit(db, userId, purpose, max) {
  const result = await run(
    db,
    `INSERT INTO media_upload_limits(user_id,purpose,bucket,count) VALUES(?,?,?,1)
    ON CONFLICT(user_id,purpose,bucket) DO UPDATE SET count=count+1 WHERE count<?`,
    userId,
    purpose,
    Math.floor(Date.now() / hour),
    max,
  );
  if (!result.meta.changes)
    throw new HttpError(
      "Hai già caricato diverse foto. Riprova più tardi.",
      429,
    );
}

function canSendPrivateCopy(request, env) {
  return (
    new URL(request.url).protocol === "https:" || isLocalRequest(request, env)
  );
}

async function profile(request, env, userId) {
  const row = await first(
    env.DB,
    `SELECT u.name,u.nickname,u.badge,u.badge_text,u.holiday_profile,u.phone,u.notify_email,u.notify_telegram,u.telegram_chat_id,
    (SELECT COUNT(DISTINCT stamp) FROM user_stamps WHERE user_id=u.id) AS stamps_count,
    (SELECT COUNT(*) FROM competition_attempts WHERE user_id=u.id AND raw_score IS NOT NULL) +
    (SELECT COUNT(*) FROM practice_games WHERE user_id=u.id AND done=1) AS games_played,
    a.kind,a.preset,a.revision FROM users u LEFT JOIN user_avatars a ON a.user_id=u.id WHERE u.id=?`,
    userId,
  );
  if (!row) throw new HttpError("Accedi per continuare.", 401);
  const holidayProfile = parseHolidayProfile(row.holiday_profile);
  const today = romeToday();
  const activity = (await loadHolidayActivities(env.DB, [userId])).get(userId);
  const portrait = computeHolidayPortrait(holidayProfile, {
    name: row.name,
    nickname: row.nickname,
    badge: row.badge,
    stampsCount: row.stamps_count || 0,
    gamesPlayed: row.games_played || 0,
    today,
    activity,
  });
  return json({
    name: row.name || "",
    nickname: row.nickname || "",
    badge: row.badge || null,
    badgeText: row.badge_text || "nickname",
    holidayProfile,
    dailyCheckin: {
      today,
      pendingToday: holidayProfile.lastPromptDate !== today,
      lastPromptDate: holidayProfile.lastPromptDate,
      lastPromptStatus: holidayProfile.lastPromptStatus,
      skippedCount: holidayProfile.skippedDates.length,
      completedCount: holidayProfile.completedDates.length,
    },
    stampsCount: row.stamps_count || 0,
    gamesPlayed: row.games_played || 0,
    context: { activity },
    portrait: {
      completeness: portrait.completeness,
      answeredCount: portrait.answeredCount,
      totalQuestions: portrait.totalQuestions,
      confidenceLevel: portrait.confidenceLevel,
      confidencePct: portrait.confidencePct,
      skippedCount: portrait.skippedCount,
      completedCount: portrait.completedCount,
      ignoredToday: portrait.ignoredToday,
      tastes: portrait.tastes,
      characterMatches: portrait.characterMatches,
      topCharacter: portrait.topCharacter,
      generatedDescription: portrait.generatedDescription,
      descriptionParts: portrait.descriptionParts,
      privateSignalParts: portrait.privateSignalParts,
      finalDescription: portrait.finalDescription,
      spiritScene: portrait.spiritScene,
      matchingExplanation: portrait.matchingExplanation,
    },
    phone: row.phone || "",
    notifyEmail: !!row.notify_email,
    emailAvailable: !!(env.RESEND_API_KEY && env.MAIL_FROM),
    notifyTelegram: !!row.notify_telegram,
    telegramLinked: !!row.telegram_chat_id,
    telegramAvailable: telegramAvailable(env),
    photoAvailable: true,
    photoBackupAvailable:
      canSendPrivateCopy(request, env) && photoBackupConfigured(env),
    avatar:
      row.kind === "photo"
        ? { kind: "photo", value: row.revision }
        : row.kind === "preset"
          ? { kind: "preset", value: row.preset }
          : null,
  });
}

function sanitizeHolidayProfile(
  input,
  existingRaw = null,
  action = null,
  moodId = null,
) {
  const existing = parseHolidayProfile(existingRaw);
  const next = { ...existing, ...input };
  if (
    input &&
    Object.hasOwn(input, "activity") &&
    input.activity !== existing.activity &&
    !Object.hasOwn(input, "activityPreset")
  )
    delete next.activityPreset;
  const parsed = parseHolidayProfile(next);
  const today = romeToday();
  let lastPromptDate = existing.lastPromptDate;
  let lastPromptStatus = existing.lastPromptStatus;
  const skipped = new Set(existing.skippedDates);
  const completed = new Set(existing.completedDates);

  if (action === "complete") {
    lastPromptDate = today;
    lastPromptStatus = "completed";
    skipped.delete(today);
    completed.add(today);
  } else if (action === "skip") {
    lastPromptDate = today;
    if (!completed.has(today)) {
      lastPromptStatus = "skipped";
      skipped.add(today);
    }
  }

  return {
    quote: safeText(parsed.quote, 160, false),
    activity: safeText(parsed.activity, 120, false),
    ...(parsed.activityPreset ? { activityPreset: parsed.activityPreset } : {}),
    iconMessage: parsed.iconMessage,
    iconCaption: safeText(parsed.iconCaption, 120, false),
    riddle: safeText(parsed.riddle, 240, false),
    riddleHint: safeText(parsed.riddleHint, 160, false),
    riddleAnswer: safeText(parsed.riddleAnswer, 120, false),
    answers: parsed.answers,
    customDescription: safeText(parsed.customDescription, 1200, false),
    portraitApproved: parsed.portraitApproved,
    // Dates on a newly chosen daily state are always owned by the server.
    dailyMood:
      action === "complete" && moodId
        ? { id: moodId, date: today }
        : existing.dailyMood,
    lastPromptDate,
    lastPromptStatus,
    skippedDates: [...skipped].sort().slice(-60),
    completedDates: [...completed].sort().slice(-60),
    updatedAt: new Date().toISOString(),
  };
}

async function saveDailyCheckin(env, userId, body) {
  const action = body?.action;
  if (action !== "skip" && action !== "complete") {
    throw new HttpError("Scegli se completare o ignorare per oggi.");
  }
  const existing = await first(
    env.DB,
    "SELECT holiday_profile FROM users WHERE id=?",
    userId,
  );
  if (!existing) throw new HttpError("Accedi per continuare.", 401);
  const previous = parseHolidayProfile(existing.holiday_profile);
  let source =
    action === "complete" &&
    body?.holidayProfile &&
    typeof body.holidayProfile === "object"
      ? {
          ...body.holidayProfile,
          answers: { ...previous.answers, ...body.holidayProfile.answers },
        }
      : null;
  if (action === "complete" && Object.hasOwn(body, "moodId")) {
    if (!holidayMoods.some((mood) => mood.id === body.moodId))
      throw new HttpError("Scegli uno degli stati proposti.");
    source = { ...source, dailyMood: { id: body.moodId, date: romeToday() } };
  }
  const nextHolidayProfile = JSON.stringify(
    sanitizeHolidayProfile(
      source,
      existing.holiday_profile,
      action,
      body.moodId,
    ),
  );
  await run(
    env.DB,
    "UPDATE users SET holiday_profile=? WHERE id=?",
    nextHolidayProfile,
    userId,
  );
}

async function updateProfile(env, userId, body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new HttpError("Controlla i dati del profilo.");
  for (const key of ["notifyEmail", "notifyTelegram"]) {
    if (Object.hasOwn(body, key) && typeof body[key] !== "boolean")
      throw new HttpError("Scegli come ricevere gli avvisi.");
  }
  const hasName = Object.hasOwn(body, "name");
  const nextName = hasName ? safeText(body.name, 80, true) : null;
  const hasNickname = Object.hasOwn(body, "nickname");
  const nextNickname = hasNickname
    ? safeText(body.nickname, 40, false) || null
    : null;
  const hasBadge = Object.hasOwn(body, "badge");
  let nextBadge = null;
  if (hasBadge) {
    if (body.badge === null || body.badge === "" || body.badge === "none") {
      nextBadge = null;
    } else if (
      typeof body.badge === "string" &&
      holidayBadgeIds.has(body.badge)
    ) {
      nextBadge = body.badge;
    } else {
      throw new HttpError("Scegli una targhettina natalizia valida.");
    }
  }
  const hasBadgeText = Object.hasOwn(body, "badgeText");
  let nextBadgeText = null;
  if (hasBadgeText) {
    if (
      typeof body.badgeText === "string" &&
      badgeTextModes.has(body.badgeText)
    ) {
      nextBadgeText = body.badgeText;
    } else {
      throw new HttpError("Scegli come mostrare il nome sulla targhettina.");
    }
  }
  const hasHolidayProfile = Object.hasOwn(body, "holidayProfile");
  let nextHolidayProfile = null;
  if (hasHolidayProfile) {
    const existing = await first(
      env.DB,
      "SELECT holiday_profile FROM users WHERE id=?",
      userId,
    );
    const checkinAction =
      body.dailyCheckinAction === "complete" ||
      body.dailyCheckinAction === "skip"
        ? body.dailyCheckinAction
        : null;
    nextHolidayProfile = JSON.stringify(
      sanitizeHolidayProfile(
        body.holidayProfile,
        existing?.holiday_profile,
        checkinAction,
      ),
    );
  }
  const hasPhone = Object.hasOwn(body, "phone");
  const telegram =
    body.notifyTelegram === undefined ? null : Number(body.notifyTelegram);
  if (telegram && !telegramAvailable(env))
    throw new HttpError("Telegram non è ancora disponibile.", 503);
  const result = await run(
    env.DB,
    `UPDATE users SET
      name=CASE WHEN ? THEN ? ELSE name END,
      nickname=CASE WHEN ? THEN ? ELSE nickname END,
      badge=CASE WHEN ? THEN ? ELSE badge END,
      badge_text=CASE WHEN ? THEN ? ELSE badge_text END,
      holiday_profile=CASE WHEN ? THEN ? ELSE holiday_profile END,
      phone=CASE WHEN ? THEN ? ELSE phone END,
      notify_email=COALESCE(?,notify_email),
      notify_telegram=COALESCE(?,notify_telegram)
    WHERE id=? AND (COALESCE(?,0)=0 OR telegram_chat_id IS NOT NULL)`,
    Number(hasName),
    nextName,
    Number(hasNickname),
    nextNickname,
    Number(hasBadge),
    nextBadge,
    Number(hasBadgeText),
    nextBadgeText,
    Number(hasHolidayProfile),
    nextHolidayProfile,
    Number(hasPhone),
    hasPhone ? optionalPhone(body.phone) : null,
    body.notifyEmail === undefined ? null : Number(body.notifyEmail),
    telegram,
    userId,
    telegram,
  );
  if (!result.meta.changes)
    throw new HttpError(
      "Collega il tuo account Telegram prima di attivare gli avvisi.",
      409,
    );
}

const avatarKey = (revision) => `avatars/${revision}`;

async function cleanAvatar(env, revision) {
  if (!env.AVATAR_BUCKET) return;
  try {
    await env.AVATAR_BUCKET.delete(avatarKey(revision));
    await run(env.DB, "DELETE FROM avatar_cleanup WHERE revision=?", revision);
  } catch {
    // Keep the cleanup entry for the next scheduled attempt.
  }
}

export async function cleanRetiredAvatars(env) {
  if (!env.AVATAR_BUCKET) return;
  const retired = await all(
    env.DB,
    `SELECT c.revision FROM avatar_cleanup c WHERE c.due_at<=?
    AND NOT EXISTS(SELECT 1 FROM user_avatars a WHERE a.revision=c.revision AND a.kind='photo')
    ORDER BY c.due_at LIMIT 5`,
    Date.now(),
  );
  for (const { revision } of retired) await cleanAvatar(env, revision);
}

async function saveAvatar(env, userId, body) {
  const kind = body?.kind;
  if (!["none", "preset", "photo"].includes(kind))
    throw new HttpError("Scegli come mostrare il tuo avatar.");
  const preset = kind === "preset" ? body.value : null;
  if (kind === "preset" && !presets.has(preset))
    throw new HttpError("Questo personaggio non è disponibile.");
  const db = env.DB;
  const previous = await first(
    db,
    "SELECT kind,revision,thumbnail IS NULL AS in_r2 FROM user_avatars WHERE user_id=?",
    userId,
  );
  const revision = id();
  const useBucket = kind === "photo" && !!env.AVATAR_BUCKET;
  const retireBucket = previous?.kind === "photo" && previous.in_r2;
  let thumbnail = null;
  if (kind === "photo") {
    const { bytes, mime } = decodeAvatar(body.value);
    await uploadPermit(db, userId, "avatar", 10);
    if (!useBucket) thumbnail = bytes;
    else {
      // Reserve cleanup first so a Worker interruption cannot leave an untracked object.
      await run(
        db,
        "INSERT INTO avatar_cleanup(revision,due_at) VALUES(?,?)",
        revision,
        Date.now() + hour,
      );
      try {
        await env.AVATAR_BUCKET.put(avatarKey(revision), bytes, {
          httpMetadata: { contentType: mime },
        });
      } catch {
        throw new HttpError(
          "Non siamo riusciti a salvare l’avatar. Riprova tra poco.",
          503,
        );
      }
    }
  }

  const batch = [
    db
      .prepare(
        `INSERT INTO user_avatars(user_id,kind,preset,revision,thumbnail)
    SELECT ?,?,?,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM avatar_cleanup WHERE revision=? AND due_at>?)
    ON CONFLICT(user_id) DO UPDATE SET kind=excluded.kind,preset=excluded.preset,revision=excluded.revision,thumbnail=excluded.thumbnail
    WHERE user_avatars.revision=?`,
      )
      .bind(
        userId,
        kind,
        preset,
        revision,
        thumbnail,
        Number(useBucket),
        revision,
        Date.now(),
        previous?.revision ?? null,
      ),
  ];
  const whenSaved =
    "EXISTS(SELECT 1 FROM user_avatars WHERE user_id=? AND revision=?)";
  if (useBucket) {
    batch.push(
      db
        .prepare(`DELETE FROM avatar_cleanup WHERE revision=? AND ${whenSaved}`)
        .bind(revision, userId, revision),
    );
  }
  if (retireBucket) {
    batch.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO avatar_cleanup(revision,due_at)
      SELECT ?,? WHERE ${whenSaved}`,
        )
        .bind(previous.revision, Date.now(), userId, revision),
    );
  }
  const [changed] = await db.batch(batch);
  if (!changed.meta.changes) {
    if (useBucket) await cleanAvatar(env, revision);
    throw new HttpError("L’avatar è cambiato nel frattempo. Riprova.", 409);
  }
  if (retireBucket) await cleanAvatar(env, previous.revision);
}

export async function photoBackupRoute(request, env) {
  if (!canSendPrivateCopy(request, env))
    throw new HttpError("Questa azione non è disponibile.", 404);
  if (request.method !== "POST")
    throw new HttpError("Metodo non disponibile.", 405);
  if (request.headers.get("Origin") !== new URL(request.url).origin)
    throw new HttpError("Invia la copia privata da questa pagina.", 403);
  const user = await currentUser(request, env);
  if (!user) throw new HttpError("Accedi per continuare.", 401);
  if (request.headers.get("X-Photo-Consent") !== "yes")
    throw new HttpError("Conferma l’invio della copia privata.", 403);
  if (!photoBackupConfigured(env))
    throw new HttpError("La copia privata non è disponibile.", 503);
  const mime = request.headers
    .get("Content-Type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  const formatError =
    "Per la copia privata, scegli una foto JPEG, PNG o WebP valida.";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
    throw new HttpError(formatError, 415);
  let bytes;
  try {
    bytes = await readBoundedBytes(request, photoBackupLimit);
  } catch (error) {
    if (error.status === 413)
      throw new HttpError("La copia privata accetta foto fino a 25 MiB.", 413);
    throw new HttpError("Non siamo riusciti a leggere la copia privata.");
  }
  if (!validOriginalImage(bytes, mime)) throw new HttpError(formatError, 415);
  await uploadPermit(env.DB, user.id, "backup", 100);
  await sendPhotoBackup(env, bytes, mime);
  return json({ ok: true });
}

export async function profileRoute(request, env, path, body, user) {
  if (!user?.id) throw new HttpError("Accedi per continuare.", 401);
  if (path === "/api/profile") {
    if (request.method === "GET") return profile(request, env, user.id);
    if (request.method === "PUT") {
      await updateProfile(env, user.id, body);
      return profile(request, env, user.id);
    }
  } else if (request.method === "POST") {
    if (path === "/api/profile/telegram-link")
      return createTelegramLink(env, user.id);
    if (path === "/api/profile/telegram-disconnect") {
      await disconnectTelegram(env, user.id);
      return profile(request, env, user.id);
    }
    if (path === "/api/profile/avatar") {
      await saveAvatar(env, user.id, body);
      return profile(request, env, user.id);
    }
    if (path === "/api/profile/identity") {
      await updateProfile(env, user.id, body);
      return profile(request, env, user.id);
    }
    if (path === "/api/profile/daily-checkin") {
      await saveDailyCheckin(env, user.id, body);
      return profile(request, env, user.id);
    }
  }
  throw new HttpError("Questa azione non è disponibile.", 404);
}

export async function avatarRoute(request, env, user) {
  if (!user?.id) throw new HttpError("Accedi per continuare.", 401);
  if (request.method !== "GET")
    throw new HttpError("Metodo non disponibile.", 405);
  const url = new URL(request.url);
  const target = /^\/api\/avatars\/([\w-]{1,64})$/.exec(url.pathname)?.[1];
  const revision = url.searchParams.get("v");
  if (!target || !revision || revision.length > 64)
    throw new HttpError("Avatar non disponibile.", 404);
  const row = await first(
    env.DB,
    `SELECT a.revision,a.thumbnail FROM user_avatars a
    WHERE a.user_id=? AND a.kind='photo' AND a.revision=? AND (a.user_id=? OR EXISTS (
      SELECT 1 FROM members target JOIN events e ON e.id=target.event_id
      WHERE target.user_id=a.user_id AND (
        (e.owner_id=? AND target.status IN ('approved','pending'))
        OR (target.status='approved' AND EXISTS (SELECT 1 FROM members viewer
          WHERE viewer.event_id=e.id AND viewer.user_id=? AND viewer.status='approved'))
      )
    ))`,
    target,
    revision,
    user.id,
    user.id,
    user.id,
  );
  if (!row) throw new HttpError("Avatar non disponibile.", 404);
  let bytes;
  if (row.thumbnail != null) bytes = new Uint8Array(row.thumbnail);
  else {
    const object = await env.AVATAR_BUCKET?.get(avatarKey(row.revision));
    if (object && object.size <= avatarLimit)
      bytes = new Uint8Array(await object.arrayBuffer());
  }
  const mime = bytes && bytes.length <= avatarLimit ? avatarImage(bytes) : null;
  if (!mime) throw new HttpError("Avatar non disponibile.", 404);
  return new Response(bytes, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
