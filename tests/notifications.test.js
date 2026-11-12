import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  profileRoute,
  avatarRoute,
  cleanRetiredAvatars,
} from "../worker/profile.js";
import { telegramWebhook } from "../worker/telegram.js";
import { eventRoute } from "../worker/events.js";
import worker from "../worker/index.js";
import {
  notificationRoute,
  runNotifications,
} from "../worker/notifications.js";

const directory = new URL("../migrations/", import.meta.url);
const now = Date.parse("2026-12-03T16:00:00.000Z");
const user = { id: "anna" };
const png = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 42);
let sql;
let env;
let calls;
let images;

function bound(db, query, args) {
  return {
    execute() {
      const result = db.prepare(query).run(...args);
      return { meta: { changes: Number(result.changes) } };
    },
    async run() {
      return this.execute();
    },
    async first() {
      return db.prepare(query).get(...args) || null;
    },
    async all() {
      return { results: db.prepare(query).all(...args) };
    },
  };
}

function request(path, method = "GET", body, headers) {
  return new Request(`https://santa.example${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body } : {}),
  });
}

function profile(path = "", method = "GET", body = {}) {
  const url = `/api/profile${path}`;
  return profileRoute(request(url, method), env, url, body, user);
}

function reply(result, status = 200) {
  return Response.json({ ok: status === 200, result }, { status });
}

beforeEach(() => {
  sql = new DatabaseSync(":memory:");
  for (const name of readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    sql.exec(readFileSync(new URL(name, directory), "utf8"));
  }
  const DB = {
    prepare: (query) => ({ bind: (...args) => bound(sql, query, args) }),
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const output = statements.map((statement) => statement.execute());
        sql.exec("COMMIT");
        return output;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  };
  images = new Map();
  env = {
    DB,
    AVATAR_BUCKET: {
      async put(key, bytes) {
        images.set(key, bytes.slice());
      },
      async get(key) {
        const bytes = images.get(key);
        return bytes
          ? {
              size: bytes.byteLength,
              async arrayBuffer() {
                return bytes.slice().buffer;
              },
            }
          : null;
      },
      async delete(key) {
        images.delete(key);
      },
    },
    APP_URL: "https://santa.example",
    TELEGRAM_BOT_TOKEN: "12345:test-token",
    TELEGRAM_BOT_USERNAME: "SottoAlberoTestBot",
    TELEGRAM_WEBHOOK_SECRET: "test-secret",
    MAIL_FROM: "Natale <santa@example.test>",
    RESEND_API_KEY: "resend-test",
  };
  sql.exec(`INSERT INTO users(id,email,name,notify_email) VALUES
    ('anna','anna@example.test','Anna',0),('bruno','bruno@example.test','Bruno',0),
    ('chiara','chiara@example.test','Chiara',0),('estraneo','estraneo@example.test','Estraneo',0);
    INSERT INTO groups(id,owner_id,name) VALUES('gruppo','anna','Natale');
    INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at)
    VALUES('evento','anna','gruppo','Regali',20,'','2026-12-02T16:00:00.000Z','2026-12-03T16:30:00.000Z','2026-12-24T16:00:00.000Z','abc','2026-12-01T16:00:00.000Z');
    INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES
    ('ma','evento','anna','approved',''),('mb','evento','bruno','approved',''),('mc','evento','chiara','pending','');`);
  calls = [];
  vi.stubGlobal("fetch", async (url, init) => {
    calls.push({
      url: String(url),
      body: init?.body,
      redirect: init?.redirect,
    });
    if (
      String(url).endsWith("/sendMessage") ||
      String(url).endsWith("/sendDocument")
    )
      return reply(true);
    if (url === "https://api.resend.com/emails")
      return Response.json({ id: "test-email" });
    throw new Error("Chiamata esterna inattesa");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  sql.close();
});

function jpeg256() {
  // JPEG markers and a 256×256 frame header. Transport tests do not decode pixels.
  return Uint8Array.of(
    255,
    216,
    255,
    192,
    0,
    11,
    8,
    1,
    0,
    1,
    0,
    1,
    1,
    17,
    0,
    255,
    217,
  );
}

it("consuma il collegamento Telegram una sola volta e soltanto nella chat privata del mittente", async () => {
  const { url } = await (await profile("/telegram-link", "POST")).json();
  const start = new URL(url).searchParams.get("start");
  const hook = (id, type, secret = env.TELEGRAM_WEBHOOK_SECRET, sender = id) =>
    telegramWebhook(
      request(
        "/api/telegram/webhook",
        "POST",
        JSON.stringify({
          message: {
            text: `/start ${start}`,
            chat: { id, type },
            from: { id: sender },
          },
        }),
        { "X-Telegram-Bot-Api-Secret-Token": secret },
      ),
      env,
    );
  await expect(hook(1001, "private", "fake")).rejects.toMatchObject({
    status: 403,
  });
  await hook(1001, "group");
  await hook(1001, "private", env.TELEGRAM_WEBHOOK_SECRET, 9009);
  expect((await (await profile()).json()).telegramLinked).toBe(false);
  await hook(1001, "private");
  await hook(2002, "private");
  expect(
    sql
      .prepare(
        "SELECT telegram_chat_id,notify_telegram FROM users WHERE id='anna'",
      )
      .get(),
  ).toEqual({ telegram_chat_id: "1001", notify_telegram: 0 });
  await profile("", "PUT", { notifyTelegram: true, phone: "+39 333 1234567" });
  expect((await (await profile()).json()).notifyTelegram).toBe(true);
  await profile("/telegram-disconnect", "POST");
  expect(await (await profile()).json()).toMatchObject({
    telegramLinked: false,
    notifyTelegram: false,
  });
});

it("rifiuta l’upload dell’originale anche in presenza di un bucket e del consenso precedente", async () => {
  const path = "/api/profile/photo-original";
  const headers = { "Content-Type": "image/png", "X-Photo-Consent": "yes" };
  await expect(
    profileRoute(request(path, "POST", png, headers), env, path, {}, user),
  ).rejects.toMatchObject({ status: 404 });
  expect(calls).toEqual([]);
  expect(images.size).toBe(0);
});

const localOrigin = "http://127.0.0.1:8787";
const backupPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII=",
  "base64",
);

function enablePhotoBot() {
  env.LOCAL_DEV = "true";
  env.TELEGRAM_PHOTO_BOT_TOKEN = "56789:photo-test-token";
  env.TELEGRAM_OWNER_CHAT_ID = "9001";
}

function backupRequest({
  origin = localOrigin,
  cookie = true,
  consent = true,
  base = localOrigin,
  body = backupPng,
  mime = "image/png",
} = {}) {
  const session = "a".repeat(64);
  sql
    .prepare(
      "INSERT OR IGNORE INTO sessions(digest,user_id,expires) VALUES(?,?,?)",
    )
    .run(
      createHash("sha256").update(session).digest("hex"),
      user.id,
      Date.now() + 60_000,
    );
  const headers = new Headers({
    "Content-Type": mime,
    "X-Owner-Chat-Id": "9999",
  });
  if (origin) headers.set("Origin", origin);
  if (cookie) headers.set("Cookie", `santa_session=${session}`);
  if (consent) headers.set("X-Photo-Consent", "yes");
  return worker.fetch(
    new Request(base + "/api/profile/photo-backup", {
      method: "POST",
      body,
      headers,
    }),
    env,
  );
}

async function localProfile() {
  return (
    await profileRoute(
      new Request(localOrigin + "/api/profile"),
      env,
      "/api/profile",
      {},
      user,
    )
  ).json();
}

it("richiede consenso, sessione e origine corretta anche in produzione", async () => {
  enablePhotoBot();
  expect((await localProfile()).photoBackupAvailable).toBe(true);
  env.LOCAL_DEV = "false";
  expect((await (await profile()).json()).photoBackupAvailable).toBe(true);
  const https = {
    base: "https://santa.example",
    origin: "https://santa.example",
  };
  expect((await backupRequest({ ...https, cookie: false })).status).toBe(401);
  expect((await backupRequest({ ...https, consent: false })).status).toBe(403);
  expect((await backupRequest({ ...https, origin: null })).status).toBe(403);
  expect(
    (await backupRequest({ ...https, origin: "https://altro.example" })).status,
  ).toBe(403);
  expect(calls).toEqual([]);
  expect((await backupRequest(https)).status).toBe(200);
  expect(calls[0].body.get("chat_id")).toBe("9001");
});

it("permette HTTP soltanto sull’anteprima locale", async () => {
  enablePhotoBot();
  expect((await backupRequest({ cookie: false })).status).toBe(401);
  expect((await backupRequest({ consent: false })).status).toBe(403);
  expect((await backupRequest({ origin: null })).status).toBe(403);
  expect(
    (await backupRequest({ origin: "https://altro.example" })).status,
  ).toBe(403);
  env.LOCAL_DEV = "false";
  expect((await localProfile()).photoBackupAvailable).toBe(false);
  expect((await backupRequest()).status).toBe(404);
  const remote = "http://santa.example";
  env.LOCAL_DEV = "true";
  expect((await backupRequest({ base: remote, origin: remote })).status).toBe(
    404,
  );
  expect(calls).toEqual([]);
});

it("usa soltanto il bot immagini, invia i byte originali alla chat configurata e non li salva", async () => {
  enablePhotoBot();
  delete env.TELEGRAM_BOT_TOKEN;
  const settings = await localProfile();
  expect(settings).toMatchObject({
    photoBackupAvailable: true,
    telegramAvailable: false,
  });
  expect(JSON.stringify(settings)).not.toContain("9001");
  const result = await backupRequest();
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ ok: true });
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe(
    "https://api.telegram.org/bot56789:photo-test-token/sendDocument",
  );
  expect(calls[0].redirect).toBe("manual");
  expect(calls[0].body.get("chat_id")).toBe("9001");
  expect(
    Buffer.from(await calls[0].body.get("document").arrayBuffer()),
  ).toEqual(backupPng);
  expect(images.size).toBe(0);
  expect(sql.prepare("SELECT COUNT(*) AS n FROM user_avatars").get().n).toBe(0);
});

it("non usa il bot notifiche e rifiuta una destinazione che non sia una chat privata", async () => {
  enablePhotoBot();
  expect((await localProfile()).photoBackupAvailable).toBe(true);
  env.TELEGRAM_OWNER_CHAT_ID = "-1001234567890";
  expect((await localProfile()).photoBackupAvailable).toBe(false);
  expect((await backupRequest()).status).toBe(503);
  env.TELEGRAM_OWNER_CHAT_ID = "9001";
  env.TELEGRAM_PHOTO_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
  expect((await localProfile()).photoBackupAvailable).toBe(false);
  expect((await backupRequest()).status).toBe(503);
  delete env.TELEGRAM_PHOTO_BOT_TOKEN;
  expect((await localProfile()).photoBackupAvailable).toBe(false);
  expect((await backupRequest()).status).toBe(503);
  expect(calls).toEqual([]);
});

it("rifiuta file non validi e nasconde i dettagli del provider quando l’invio fallisce", async () => {
  enablePhotoBot();
  expect(
    (await backupRequest({ body: new Uint8Array(25 * 1024 * 1024 + 1) }))
      .status,
  ).toBe(413);
  expect((await backupRequest({ body: jpeg256() })).status).toBe(415);
  expect(calls).toEqual([]);
  vi.stubGlobal("fetch", async () => {
    throw new Error(
      "Errore " +
        env.TELEGRAM_PHOTO_BOT_TOKEN +
        " alla chat " +
        env.TELEGRAM_OWNER_CHAT_ID,
    );
  });
  const result = await backupRequest();
  expect(result.status).toBe(503);
  const detail = await result.text();
  expect(detail).not.toContain(env.TELEGRAM_PHOTO_BOT_TOKEN);
  expect(detail).not.toContain(env.TELEGRAM_OWNER_CHAT_ID);
});

it("conserva la miniatura solo in R2, la serve agli iscritti autorizzati e rimuove le versioni sostituite", async () => {
  expect((await (await profile()).json()).photoAvailable).toBe(true);
  const image = `data:image/jpeg;base64,${Buffer.from(jpeg256()).toString("base64")}`;
  const saved = await (
    await profile("/avatar", "POST", { kind: "photo", value: image })
  ).json();
  expect(saved.avatar).toMatchObject({
    kind: "photo",
    value: expect.any(String),
  });
  const row = sql
    .prepare("SELECT * FROM user_avatars WHERE user_id='anna'")
    .get();
  expect(row).toEqual({
    user_id: "anna",
    kind: "photo",
    preset: null,
    revision: saved.avatar.value,
    thumbnail: null,
  });
  expect(JSON.stringify(row)).not.toContain(image);
  expect([...images.values()]).toEqual([jpeg256()]);
  const path = `/api/avatars/anna?v=${saved.avatar.value}`;
  for (const id of ["estraneo", "chiara"]) {
    await expect(avatarRoute(request(path), env, { id })).rejects.toMatchObject(
      { status: 404 },
    );
  }
  const avatar = await avatarRoute(request(path), env, { id: "bruno" });
  expect(avatar.headers.get("Cache-Control")).toBe("no-store");
  expect(avatar.headers.get("Content-Type")).toBe("image/jpeg");
  expect(new Uint8Array(await avatar.arrayBuffer())).toEqual(jpeg256());
  await profile("/avatar", "POST", { kind: "photo", value: image });
  expect(images.size).toBe(1);
  await expect(avatarRoute(request(path), env, user)).rejects.toMatchObject({
    status: 404,
  });
  await profile("/avatar", "POST", { kind: "preset", value: "elf" });
  expect(images.size).toBe(0);
  expect((await (await profile()).json()).avatar).toEqual({
    kind: "preset",
    value: "elf",
  });
  expect(calls).toEqual([]);
});

it("senza R2 conserva in D1 solo la miniatura corrente e mantiene gli stessi controlli di accesso", async () => {
  const imageData = (bytes) =>
    `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;
  const large = new Uint8Array(65537);
  large.set(jpeg256());
  await expect(
    profile("/avatar", "POST", { kind: "photo", value: imageData(large) }),
  ).rejects.toMatchObject({ status: 413 });
  const wrongSize = jpeg256();
  wrongSize[10] = 1;
  await expect(
    profile("/avatar", "POST", { kind: "photo", value: imageData(wrongSize) }),
  ).rejects.toMatchObject({ status: 415 });
  delete env.AVATAR_BUCKET;
  expect((await (await profile()).json()).photoAvailable).toBe(true);
  const upload = () =>
    profile("/avatar", "POST", { kind: "photo", value: imageData(jpeg256()) });
  const { avatar } = await (await upload()).json();
  const path = `/api/avatars/anna?v=${avatar.value}`;
  await expect(
    avatarRoute(request(path), env, { id: "estraneo" }),
  ).rejects.toMatchObject({ status: 404 });
  const stored = await avatarRoute(request(path), env, { id: "bruno" });
  expect(new Uint8Array(await stored.arrayBuffer())).toEqual(jpeg256());
  const { avatar: replacement } = await (await upload()).json();
  expect(replacement.value).not.toBe(avatar.value);
  await expect(avatarRoute(request(path), env, user)).rejects.toMatchObject({
    status: 404,
  });
  expect(
    sql
      .prepare(
        "SELECT COUNT(*) AS n FROM user_avatars WHERE thumbnail IS NOT NULL",
      )
      .get().n,
  ).toBe(1);
  const saved = await profile("/avatar", "POST", {
    kind: "preset",
    value: "snowman",
  });
  expect((await saved.json()).avatar).toEqual({
    kind: "preset",
    value: "snowman",
  });
  expect(images.size).toBe(0);
  expect(
    sql
      .prepare(
        "SELECT COUNT(*) AS n FROM user_avatars WHERE thumbnail IS NOT NULL",
      )
      .get().n,
  ).toBe(0);
  expect(calls).toEqual([]);
});

it("ritenta la cancellazione di una miniatura disattivata se il bucket non risponde", async () => {
  const image = `data:image/jpeg;base64,${Buffer.from(jpeg256()).toString("base64")}`;
  const { avatar } = await (
    await profile("/avatar", "POST", { kind: "photo", value: image })
  ).json();
  const deleteImage = env.AVATAR_BUCKET.delete;
  env.AVATAR_BUCKET.delete = async () => {
    throw new Error("Errore temporaneo del bucket");
  };
  await profile("/avatar", "POST", { kind: "none" });
  expect(images.size).toBe(1);
  await expect(
    avatarRoute(request(`/api/avatars/anna?v=${avatar.value}`), env, user),
  ).rejects.toMatchObject({ status: 404 });
  env.AVATAR_BUCKET.delete = deleteImage;
  await cleanRetiredAvatars(env);
  expect(images.size).toBe(0);
  expect(sql.prepare("SELECT COUNT(*) AS n FROM avatar_cleanup").get().n).toBe(
    0,
  );
});

it("la migrazione conserva i preset ed elimina i riferimenti agli avatar Telegram senza chiamare il bot", () => {
  const legacy = new DatabaseSync(":memory:");
  try {
    for (const name of readdirSync(directory)
      .filter(
        (name) => name.endsWith(".sql") && name < "0010_avatar_storage.sql",
      )
      .sort()) {
      legacy.exec(readFileSync(new URL(name, directory), "utf8"));
    }
    legacy.exec(`INSERT INTO users(id,email,name) VALUES ('anna','anna@example.test','Anna'),('bruno','bruno@example.test','Bruno');
      INSERT INTO user_avatars(user_id,kind,preset,file_id,message_id,revision) VALUES
      ('anna','photo',NULL,'old-file',12,'old-revision'),('bruno','preset','elf',NULL,NULL,'preset-revision');`);
    legacy.exec(
      readFileSync(new URL("0010_avatar_storage.sql", directory), "utf8"),
    );
    expect(legacy.prepare("SELECT * FROM user_avatars").all()).toEqual([
      {
        user_id: "bruno",
        kind: "preset",
        preset: "elf",
        revision: "preset-revision",
      },
    ]);
    expect(calls).toEqual([]);
  } finally {
    legacy.close();
  }
});

it("invia un solo avviso generico alla chat del donatore che ha attivato Telegram", async () => {
  sql.exec(`UPDATE users SET telegram_chat_id='101',notify_telegram=1 WHERE id='anna';
    UPDATE users SET telegram_chat_id='202',notify_telegram=0 WHERE id='bruno';
    UPDATE events SET status='drawn',version=4,draw_at='2026-12-03T15:59:00.000Z' WHERE id='evento';
    INSERT INTO assignments(event_id,version,giver_id,receiver_id) VALUES('evento',4,'ma','mb'),('evento',4,'mb','ma');
    INSERT INTO audit(id,event_id,actor_id,action,created_at) VALUES('aud','evento','anna','draw','2026-12-03T15:59:00.000Z');`);
  await runNotifications(env, now);
  await runNotifications(env, now + 60000);
  const sent = calls
    .filter((call) => call.url.endsWith("/sendMessage"))
    .map((call) => JSON.parse(call.body))
    .filter((call) => call.text.includes("La tua lettera per Regali"));
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({
    chat_id: "101",
    text: expect.not.stringContaining("Bruno"),
  });
  expect(sent[0]).not.toHaveProperty("parse_mode");
});

it("ricontrolla iscrizione e consenso al momento dell’invio e non accoda avvisi di altri organizzatori", async () => {
  sql.exec(
    `UPDATE users SET notify_email=1 WHERE id IN ('anna','bruno','chiara');`,
  );
  const path = "/api/notifications/evento/announce";
  const req = request(path, "POST");
  await expect(
    notificationRoute(
      req,
      env,
      path,
      { message: "Cambio orario" },
      { id: "bruno" },
    ),
  ).rejects.toMatchObject({ status: 403 });
  const output = await notificationRoute(
    req,
    env,
    path,
    { message: "Cambio orario" },
    user,
  );
  expect(await output.json()).toMatchObject({ ok: true, queued: 2 });
  sql.exec(`UPDATE users SET notify_email=0 WHERE id='bruno';`);
  await runNotifications(env);
  const sent = calls
    .filter((call) => call.url === "https://api.resend.com/emails")
    .map((call) => JSON.parse(call.body))
    .filter((call) => call.subject.startsWith("Un avviso per"));
  expect(sent).toHaveLength(1);
  expect(sent[0].to).toEqual(["anna@example.test"]);
  expect(sent[0].html).toContain("Cambio orario");
});

it("accoda una sola volta il riepilogo, il promemoria e l’invito al duello", async () => {
  sql.exec(`UPDATE users SET telegram_chat_id='101',notify_telegram=1 WHERE id='anna';
    INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at)
      SELECT 'secondo',owner_id,group_id,'Regali bis',budget,description,'2026-12-01T16:00:00.000Z','2026-12-02T16:00:00.000Z',gift_at,'abc2',created_at FROM events WHERE id='evento';
    INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES('seconda-anna','secondo','anna','approved','');
    INSERT INTO competition_entries(event_id,user_id,adjustment) VALUES('evento','anna',35),('evento','bruno',20),('secondo','anna',80);
    INSERT INTO competition_duels(id,event_id,sender_id,receiver_id,questions,expires)
      VALUES('duello','evento','bruno','anna','[]',${now + 3600000});`);
  await runNotifications(env, now);
  await runNotifications(env, now + 60000);
  const sent = calls
    .filter((call) => call.url.endsWith("/sendMessage"))
    .map((call) => JSON.parse(call.body));
  expect(sent.filter((call) => call.text.includes("35 punti"))).toHaveLength(1);
  expect(sent.filter((call) => call.text.includes("80 punti"))).toHaveLength(1);
  expect(
    sent.filter(
      (call) =>
        call.text.includes("Promemoria") && call.text.includes("Estrazione"),
    ),
  ).toHaveLength(1);
  expect(
    sent.filter((call) =>
      call.text.includes("Bruno ti ha invitato a una sfida"),
    ),
  ).toHaveLength(1);
  expect(sent.every((call) => call.chat_id === "101")).toBe(true);
});

it("raggruppa le nuove richieste per il solo organizzatore, anche se non partecipa", async () => {
  vi.setSystemTime(now);
  try {
    sql.exec(`UPDATE events SET description='Ci vediamo a Natale',close_at='2026-12-10T16:00:00.000Z',draw_at='2026-12-11T16:00:00.000Z';
      UPDATE users SET telegram_chat_id=CASE id WHEN 'anna' THEN '101' ELSE '202' END,notify_telegram=1 WHERE id IN ('anna','bruno');
      DELETE FROM members WHERE user_id IN ('anna','chiara');
      INSERT INTO invites(id,event_id,email,state,created_at,token) VALUES ('personale','evento','chiara@example.test','sent','2026-12-03T15:00:00.000Z','per-chiara');`);
    const join = (id, token) =>
      eventRoute(
        request("/api/events/evento/join", "POST"),
        env,
        "/api/events/evento/join",
        { token },
        { id, email: `${id}@example.test` },
      );
    await Promise.all([
      join("chiara", "per-chiara"),
      join("estraneo", "abc"),
      join("chiara", "per-chiara"),
    ]);
    await runNotifications(env, now + 60_000);
    expect(calls).toEqual([]);
    await runNotifications(env, now + 15 * 60_000);
    await runNotifications(env, now + 16 * 60_000);
    const sent = calls.map((call) => JSON.parse(call.body));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      chat_id: "101",
      text: expect.stringContaining("Chiara ha accettato l’invito"),
    });
    expect(sent[0].text).toContain("Estraneo chiede di partecipare");
    expect(sent[0].text).toContain("/events/evento?tab=admin#event-members");
  } finally {
    vi.useRealTimers();
  }
});

it("riserva il promemoria delle iscrizioni all’organizzatore e invia un solo avviso per scadenza", async () => {
  sql.exec(`UPDATE events SET close_at='2026-12-04T16:00:00.000Z',draw_at='2026-12-05T16:00:00.000Z';
    UPDATE users SET telegram_chat_id=CASE id WHEN 'anna' THEN '101' ELSE '202' END,notify_telegram=1 WHERE id IN ('anna','bruno');`);
  await runNotifications(env, now);
  await runNotifications(env, now + 23 * 3_600_000);
  const sent = calls.map((call) => JSON.parse(call.body));
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({
    chat_id: "101",
    text: expect.stringContaining("Le iscrizioni per Regali chiudono a breve"),
  });
  expect(sent[0].text).toContain("messaggio di benvenuto");
  expect(sent[0].text).toContain("/events/evento?tab=admin#event-settings");
});

it("non invia il riepilogo se la chat viene riassegnata mentre prepara i nomi", async () => {
  sql.exec(`UPDATE events SET description='Ci vediamo a Natale',close_at='2026-12-10T16:00:00.000Z',draw_at='2026-12-11T16:00:00.000Z';
    UPDATE users SET telegram_chat_id='101',notify_telegram=1 WHERE id='anna';
    UPDATE members SET updated_at='2026-12-03T15:50:00.000Z' WHERE id='mc';
    INSERT INTO notification_jobs(event_id,user_id,channel,kind,source_key,payload,created_at,expires_at,next_at)
    VALUES('evento','anna','telegram','reminder','registration:test',
      json_object('field','registration','from','2026-12-03T15:45:00.000Z','until','2026-12-03T16:00:00.000Z'),
      ${now},${now + 60_000},${now});`);
  const prepare = env.DB.prepare;
  let changed = false;
  env.DB.prepare = (query) => {
    const statement = prepare(query);
    if (!query.includes("AS invited")) return statement;
    return {
      bind(...args) {
        const rows = statement.bind(...args);
        return {
          async all() {
            const result = await rows.all();
            sql.exec(`UPDATE users SET telegram_chat_id=NULL,notify_telegram=0 WHERE id='anna';
              UPDATE users SET telegram_chat_id='101',notify_telegram=1 WHERE id='estraneo';`);
            changed = true;
            return result;
          },
        };
      },
    };
  };
  await runNotifications(env, now);
  expect(changed).toBe(true);
  expect(calls).toEqual([]);
  expect(
    sql
      .prepare(
        "SELECT state FROM notification_jobs WHERE source_key='registration:test'",
      )
      .get(),
  ).toEqual({ state: "skipped" });
});
