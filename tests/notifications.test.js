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
    calls.push({ url: String(url), body: init?.body });
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

it("mantiene i preset senza R2 e rifiuta le miniature oltre i limiti di formato o dimensione", async () => {
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
  expect((await (await profile()).json()).photoAvailable).toBe(false);
  await expect(
    profile("/avatar", "POST", { kind: "photo", value: imageData(jpeg256()) }),
  ).rejects.toMatchObject({ status: 503 });
  const saved = await profile("/avatar", "POST", {
    kind: "preset",
    value: "snowman",
  });
  expect((await saved.json()).avatar).toEqual({
    kind: "preset",
    value: "snowman",
  });
  expect(images.size).toBe(0);
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

it("manda il nome estratto soltanto nella chat del donatore consenziente e una sola volta", async () => {
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
    .filter((call) => call.text.includes("Tieni il nome per te."));
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({
    chat_id: "101",
    text: expect.stringContaining("Bruno"),
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
