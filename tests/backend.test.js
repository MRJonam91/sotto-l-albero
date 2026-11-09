import { beforeEach, describe, it, expect, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../worker/index.js";
import { drawEvent, scheduled, historicalRules } from "../worker/events.js";

function database() {
  const sql = new DatabaseSync(":memory:");
  for (const file of [
    "0001_initial.sql",
    "0002_claims.sql",
    "0003_auth_limits.sql",
    "0004_event_editing.sql",
    "0005_user_stamps.sql",
    "0006_registration_and_practice.sql",
    "0007_competition.sql",
    "0008_notifications.sql",
    "0009_event_competition.sql",
    "0010_avatar_storage.sql",
    "0011_avatar_thumbnail.sql",
  ])
    sql.exec(
      readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
    );
  const db = {
    prepare(query) {
      let args = [];
      const p = {
        bind(...values) {
          args = values;
          return p;
        },
        async first() {
          return sql.prepare(query).get(...args) || null;
        },
        async all() {
          return { results: sql.prepare(query).all(...args) };
        },
        async run() {
          const r = sql.prepare(query).run(...args);
          return { meta: { changes: Number(r.changes) } };
        },
      };
      return p;
    },
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const result = [];
        for (const s of statements) result.push(await s.run());
        sql.exec("COMMIT");
        return result;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return db;
}
let env;
async function api(path, method = "GET", body, cookie = "") {
  const request = new Request(`http://127.0.0.1:8787/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: "http://127.0.0.1:8787",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const response = await worker.fetch(request, env);
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("Set-Cookie")?.split(";")[0],
  };
}
async function login(email) {
  const r = await api("/auth/request", "POST", {
    email,
    name: email.split("@")[0],
    phone: "+393200000000",
  });
  const v = await api("/auth/verify", "POST", { email, code: r.data.devCode });
  expect(v.status).toBe(200);
  // Most existing fixtures exercise the legacy opt-in email flows.
  await env.DB.prepare("UPDATE users SET notify_email=1 WHERE email=?")
    .bind(email)
    .run();
  return v.cookie;
}
async function event(cookie) {
  return (
    await api(
      "/events",
      "POST",
      {
        name: "Natale tra amici",
        budget: 25,
        closeAt: "2099-12-01T18:00:00Z",
        drawAt: "2099-12-02T18:00:00Z",
        giftAt: "2099-12-24T18:00:00Z",
      },
      cookie,
    )
  ).data.event;
}
beforeEach(() => {
  env = { DB: database(), LOCAL_DEV: "true", APP_URL: "http://127.0.0.1:8787" };
});

describe("API privata", () => {
  it("registra con nome ed email e permette di aggiungere il recapito dal profilo", async () => {
    const email = "nuovo@example.test";
    const requested = await api("/auth/request", "POST", {
      name: "Ada",
      email,
    });
    expect(requested.status).toBe(200);
    const session = await api("/auth/verify", "POST", {
      email,
      code: requested.data.devCode,
    });
    expect(session.data.user).toMatchObject({
      name: "Ada",
      phone: null,
    });
    expect(session.data.user).not.toHaveProperty("telegram_chat_id");
    const updated = await api("/profile", "PUT", { phone: "+39 320 000 0000" }, session.cookie);
    expect(updated.data.phone).toBe("+393200000000");
  });

  it("restituisce lo stato effettivo sul link e preserva la conferma", async () => {
    const owner = await login("owner@example.test");
    const guest = await login("guest@example.test");
    const e = await event(owner);
    const invite = "/invite/" + e.inviteToken;
    expect((await api(invite)).data.membership).toBe(null);
    const joined = await api(
      "/events/" + e.id + "/join",
      "POST",
      { token: e.inviteToken },
      guest,
    );
    expect(joined.data.membership).toBe("pending");
    expect((await api(invite, "GET", null, guest)).data.membership).toBe(
      "pending",
    );
    const detail = await api("/events/" + e.id, "GET", null, owner);
    await api(
      "/events/" + e.id + "/members/" + detail.data.members[0].id,
      "POST",
      { status: "approved" },
      owner,
    );
    expect((await api(invite, "GET", null, guest)).data.membership).toBe(
      "approved",
    );
    expect(
      (
        await api(
          "/events/" + e.id + "/join",
          "POST",
          { token: e.inviteToken },
          guest,
        )
      ).data.membership,
    ).toBe("approved");
  });

  it("prepara l’account dal gruppo senza sessione e senza sovrascrivere un profilo esistente", async () => {
    const owner = await login("owner@example.test");
    const stranger = await login("stranger@example.test");
    const e = await event(owner);
    const path = "/events/" + e.id;
    const email = "preparato@example.test";
    const fields = { name: "Ada", email };
    expect(
      (await api(path + "/accounts", "POST", fields, stranger)).status,
    ).toBe(403);
    expect((await api(path + "/accounts", "POST", fields, owner)).status).toBe(
      201,
    );
    const request = await api("/auth/request", "POST", { email });
    expect(request.status).toBe(200);
    const session = await api("/auth/verify", "POST", {
      email,
      code: request.data.devCode,
    });
    expect(session.data.user).toMatchObject({
      name: "Ada",
      phone: null,
      organizer: false,
    });
    expect(
      (
        await api(
          path + "/accounts",
          "POST",
          { ...fields, name: "Altra", phone: "+393200000099" },
          owner,
        )
      ).status,
    ).toBe(201);
    expect(
      (await api("/me", "GET", null, session.cookie)).data.user,
    ).toMatchObject({ name: "Ada", phone: null });
    const group = (await api(path, "GET", null, session.cookie)).data.members;
    expect(group).toHaveLength(1);
    expect(group[0]).toMatchObject({ name: "Ada", status: "approved" });
    expect(group[0]).not.toHaveProperty("phone");
  });

  it("respinge un desiderio nullo con 400 e impedisce timbri senza partita", async () => {
    const owner = await login("owner@example.test");
    const guest = await login("guest@example.test");
    const e = await event(owner);
    const base = "/events/" + e.id;
    await api(base + "/join", "POST", { token: e.inviteToken }, guest);
    const detail = await api(base, "GET", null, owner);
    await api(
      base + "/members/" + detail.data.members[0].id,
      "POST",
      { status: "approved" },
      owner,
    );
    expect(
      (await api(base + "/wishlist", "PUT", { items: [null] }, guest)).status,
    ).toBe(400);
    expect(
      (await api("/stamps", "POST", { stamp: "quiz" }, guest)).status,
    ).toBe(403);
    expect(
      (await api("/stamps", "POST", { stamp: "memory" }, guest)).status,
    ).toBe(403);
  });

  it("consente giochi e timbri dei giochi soltanto a chi ha un’iscrizione approvata", async () => {
    const owner = await login("owner@example.test");
    const guest = await login("guest@example.test");
    const e = await event(owner);
    const base = "/events/" + e.id;
    expect((await api("/practice/access")).status).toBe(401);
    expect((await api("/practice/access", "GET", null, owner)).data).toEqual({
      allowed: false,
    });
    await api(base + "/join", "POST", { token: e.inviteToken }, guest);
    const member = (await api(base, "GET", null, owner)).data.members[0];
    expect((await api("/practice/access", "GET", null, guest)).data).toEqual({
      allowed: false,
    });
    for (const game of ["quiz", "memory"]) {
      expect(
        (await api(`/practice/${game}/start`, "POST", {}, guest)).status,
      ).toBe(403);
      expect(
        (await api(`/practice/${game}/step`, "POST", {}, guest)).status,
      ).toBe(403);
    }
    expect(
      (await api("/stamps", "POST", { stamp: "cookie" }, guest)).status,
    ).toBe(403);
    await api(
      base + "/members/" + member.id,
      "POST",
      { status: "approved" },
      owner,
    );
    expect((await api("/practice/access", "GET", null, guest)).data).toEqual({
      allowed: true,
    });

    const quiz = (await api("/practice/quiz/start", "POST", {}, guest)).data;
    const memory = (await api("/practice/memory/start", "POST", {}, guest))
      .data;
    expect(memory.cards).toEqual(Array(16).fill({ name: null, paired: false }));
    const names = new Set();
    let current = memory;
    for (let position = 0; position < 16; position++) {
      if (current.cover)
        current = (
          await api(
            "/practice/memory/step",
            "POST",
            { cover: true, revision: current.revision },
            guest,
          )
        ).data;
      if (current.cards[position].paired) continue;
      current = (
        await api(
          "/practice/memory/step",
          "POST",
          { position, revision: current.revision },
          guest,
        )
      ).data;
      names.add(current.cards[position].name);
    }
    expect(names).toEqual(
      new Set([
        "Stella",
        "Albero",
        "Regalo",
        "Campanella",
        "Renna",
        "Pupazzo di neve",
        "Biscotto",
        "Slitta",
      ]),
    );
    await api(
      base + "/members/" + member.id,
      "POST",
      { status: "removed" },
      owner,
    );
    expect((await api("/practice/access", "GET", null, guest)).data).toEqual({
      allowed: false,
    });
    expect(
      (
        await api(
          "/practice/quiz/step",
          "POST",
          { choice: 0, revision: quiz.revision },
          guest,
        )
      ).status,
    ).toBe(403);
    await env.DB.prepare(
      "INSERT INTO user_stamps(user_id,stamp) SELECT id,'memory' FROM users WHERE email=?",
    )
      .bind("guest@example.test")
      .run();
    expect(
      (await api("/stamps", "POST", { stamp: "memory" }, guest)).status,
    ).toBe(403);
    expect((await api("/stamps", "GET", null, guest)).data.stamps).toContain(
      "memory",
    );
  });

  it("riapre un Memory di allenamento da otto carte con la griglia aggiornata", async () => {
    const owner = await login("owner@example.test");
    const e = await event(owner);
    const base = "/events/" + e.id;
    await api(base + "/join", "POST", { token: e.inviteToken }, owner);
    const member = (await api(base, "GET", null, owner)).data.members[0];
    await api(
      base + "/members/" + member.id,
      "POST",
      { status: "approved" },
      owner,
    );
    const legacy = {
      deck: [
        "Stella",
        "Albero",
        "Regalo",
        "Campanella",
        "Stella",
        "Albero",
        "Regalo",
        "Campanella",
      ],
      open: [0],
      paired: [],
      feedback: "Prova in corso",
    };
    await env.DB.prepare(
      "INSERT INTO practice_games(user_id,game,revision,state) SELECT id,'memory','legacy',? FROM users WHERE email=?",
    )
      .bind(JSON.stringify(legacy), "owner@example.test")
      .run();
    const stale = await api(
      "/practice/memory/step",
      "POST",
      { revision: "legacy", position: 4 },
      owner,
    );
    expect(stale.status).toBe(409);
    const fresh = await api("/practice/memory/start", "POST", {}, owner);
    expect(fresh.data.cards).toEqual(
      Array(16).fill({ name: null, paired: false }),
    );
    expect(fresh.data.revision).not.toBe("legacy");
  });
  it.each([
    ["2026-12-24", "2026-12-25", "23", "00"],
    ["2026-07-24", "2026-07-24", "22", "23"],
  ])(
    "rispetta la finestra di Babbo Natale in ora italiana (%s)",
    async (previousDay, nextDay, startHour, endHour) => {
      const clock = vi.spyOn(Date, "now");
      try {
        clock.mockReturnValue(Date.parse(`${previousDay}T${startHour}:04:59Z`));
        const anna = await login("anna@example.com");
        const luca = await login("luca@example.com");
        const collect = (cookie) =>
          api("/stamps", "POST", { stamp: "santa" }, cookie);
        expect((await collect(anna)).status).toBe(409);
        clock.mockReturnValue(Date.parse(`${previousDay}T${startHour}:05:00Z`));
        expect((await collect(anna)).status).toBe(200);
        clock.mockReturnValue(Date.parse(`${nextDay}T${endHour}:05:00Z`));
        expect((await collect(luca)).status).toBe(409);
        expect((await collect(anna)).status).toBe(200);
        expect((await api("/stamps", "GET", null, anna)).data.stamps).toEqual([
          "santa",
        ]);
        expect((await api("/stamps", "GET", null, luca)).data.stamps).toEqual(
          [],
        );
      } finally {
        clock.mockRestore();
      }
    },
  );
  it("salva ogni timbro una volta sola e lo mostra soltanto al suo proprietario", async () => {
    expect((await api("/stamps")).status).toBe(401);
    const anna = await login("anna@example.com");
    const luca = await login("luca@example.com");
    expect(
      (await api("/stamps", "POST", { stamp: "sconosciuto" }, anna)).status,
    ).toBe(400);
    for (let i = 0; i < 2; i++) {
      expect(
        (await api("/stamps", "POST", { stamp: "star" }, anna)).status,
      ).toBe(200);
    }
    expect((await api("/stamps", "GET", null, anna)).data).toEqual({
      stamps: ["star"],
    });
    expect((await api("/stamps", "GET", null, luca)).data).toEqual({
      stamps: [],
    });
  });
  it("nega accessi anonimi e crea un organizzatore locale", async () => {
    expect((await api("/events")).status).toBe(401);
    const cookie = await login("anna@example.com");
    expect((await api("/me", "GET", null, cookie)).data.user.organizer).toBe(
      true,
    );
  });
  it("un OTP si può usare una sola volta", async () => {
    const r = await api("/auth/request", "POST", {
      email: "anna@example.com",
      name: "Anna",
      phone: "+393200000000",
    });
    expect(
      (
        await api("/auth/verify", "POST", {
          email: "anna@example.com",
          code: r.data.devCode,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api("/auth/verify", "POST", {
          email: "anna@example.com",
          code: r.data.devCode,
        })
      ).status,
    ).toBe(400);
  });
  it("non espone codici di sviluppo su un dominio pubblico", async () => {
    const response = await worker.fetch(
      new Request("https://santa.example/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "anna@example.com" }),
      }),
      env,
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("devCode");
  });
  it("isola gli eventi e mantiene riservati desideri e abbinamenti", async () => {
    const admin = await login("anna@example.com"),
      e = await event(admin),
      stranger = await login("estraneo@example.com");
    expect((await api(`/events/${e.id}`, "GET", null, stranger)).status).toBe(
      403,
    );
    expect(
      (await api("/events", "POST", { name: "Altro" }, stranger)).status,
    ).toBe(403);
    const cookies = [
      admin,
      await login("bea@example.com"),
      await login("carlo@example.com"),
    ];
    for (const c of cookies)
      expect(
        (await api(`/events/${e.id}/join`, "POST", { token: e.inviteToken }, c))
          .status,
      ).toBe(200);
    let detail = (await api(`/events/${e.id}`, "GET", null, admin)).data;
    for (const m of detail.members)
      expect(
        (
          await api(
            `/events/${e.id}/members/${m.id}`,
            "POST",
            { status: "approved" },
            admin,
          )
        ).status,
      ).toBe(200);
    const item = {
      type: "riddle",
      title: "Un libro",
      description: "Un giallo",
      hint: "Ha pagine",
      answer: "Un romanzo",
    };
    expect(
      (
        await api(
          `/events/${e.id}/wishlist`,
          "PUT",
          { items: [item] },
          cookies[1],
        )
      ).status,
    ).toBe(200);
    expect(
      (await api(`/events/${e.id}`, "GET", null, admin)).data.wishlist,
    ).toEqual([]);
    expect((await api(`/events/${e.id}/draw`, "POST", {}, admin)).status).toBe(
      200,
    );
    const a = (await api(`/events/${e.id}?reveal=1`, "GET", null, admin)).data;
    expect(a.assignments).toHaveLength(3);
    const b = (await api(`/events/${e.id}?reveal=1`, "GET", null, cookies[1]))
      .data;
    expect(b.assignments).toBeUndefined();
    expect(b.event.inviteToken).toBeUndefined();
    expect(b.rules).toEqual([]);
    expect(b.recipient.name).toBeTruthy();
    expect((await api(`/events/${e.id}/draw`, "POST", {}, admin)).status).toBe(
      200,
    );
    expect(
      (await api(`/events/${e.id}?reveal=1`, "GET", null, admin)).data
        .assignments,
    ).toEqual(a.assignments);
    expect(
      (await api(`/events/${e.id}/rules`, "PUT", { rules: [] }, admin)).status,
    ).toBe(409);
  });
  it("revoca gli inviti e respinge iscrizioni tardive", async () => {
    const admin = await login("anna@example.com"),
      e = await event(admin),
      guest = await login("bea@example.com");
    await api(`/events/${e.id}/rotate-invite`, "POST", {}, admin);
    expect((await api(`/invite/${e.inviteToken}`)).status).toBe(404);
    expect(
      (
        await api(
          `/events/${e.id}/join`,
          "POST",
          { token: e.inviteToken },
          guest,
        )
      ).status,
    ).toBe(400);
  });
  it("un secondo processo con snapshot vecchio non scrive coppie o email diverse", async () => {
    const admin = await login("anna@example.com"),
      e = await event(admin),
      cookies = [
        admin,
        await login("bea@example.com"),
        await login("carlo@example.com"),
        await login("dario@example.com"),
      ];
    for (const c of cookies)
      await api(`/events/${e.id}/join`, "POST", { token: e.inviteToken }, c);
    const detail = (await api(`/events/${e.id}`, "GET", null, admin)).data;
    for (const m of detail.members)
      await api(
        `/events/${e.id}/members/${m.id}`,
        "POST",
        { status: "approved" },
        admin,
      );
    const snapshot = await env.DB.prepare("SELECT * FROM events WHERE id=?")
      .bind(e.id)
      .first();
    await drawEvent(env, snapshot, "process1");
    const original = (
      await env.DB.prepare(
        "SELECT * FROM assignments WHERE event_id=? ORDER BY giver_id",
      )
        .bind(e.id)
        .all()
    ).results;
    await drawEvent(env, snapshot, "process2");
    expect(
      (
        await env.DB.prepare(
          "SELECT * FROM assignments WHERE event_id=? ORDER BY giver_id",
        )
          .bind(e.id)
          .all()
      ).results,
    ).toEqual(original);
    expect(
      (
        await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM outbox WHERE event_id=?",
        )
          .bind(e.id)
          .first()
      ).n,
    ).toBe(4);
    expect(
      (
        await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM audit WHERE event_id=? AND action='draw'",
        )
          .bind(e.id)
          .first()
      ).n,
    ).toBe(1);
    const current = (await api(`/events/${e.id}`, "GET", null, admin)).data
      .event;
    await api(
      `/events/${e.id}/cancel`,
      "POST",
      { reason: "Una persona si è ritirata.", version: current.version },
      admin,
    );
    await env.DB.prepare(
      "UPDATE events SET draw_at='2000-01-01T00:00:00.000Z' WHERE id=?",
    )
      .bind(e.id)
      .run();
    await scheduled(env);
    expect(
      (
        await env.DB.prepare("SELECT status FROM events WHERE id=?")
          .bind(e.id)
          .first()
      ).status,
    ).toBe("open");
  });
  it("un iscritto in attesa non legge i nomi degli altri partecipanti", async () => {
    const admin = await login("anna@example.com"),
      e = await event(admin),
      guest = await login("bea@example.com");
    await api(`/events/${e.id}/join`, "POST", { token: e.inviteToken }, admin);
    await api(`/events/${e.id}/join`, "POST", { token: e.inviteToken }, guest);
    const pending = (await api(`/events/${e.id}`, "GET", null, guest)).data;
    expect(pending.members).toHaveLength(1);
    expect(pending.members[0].name).toBe("bea");
    expect(
      (await api(`/events/${e.id}/wishlist`, "PUT", { items: [] }, guest))
        .status,
    ).toBe(403);
  });
  it("rifiuta richieste provenienti da un altro sito", async () => {
    const response = await worker.fetch(
      new Request("http://127.0.0.1:8787/api/auth/request", {
        method: "POST",
        headers: {
          Origin: "https://evil.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
      env,
    );
    expect(response.status).toBe(403);
  });
  it("consente nuovi inviti dopo una revoca e un errore, senza duplicare quelli in coda", async () => {
    const admin = await login("anna@example.com"),
      e = await event(admin);
    env.RESEND_API_KEY = "test";
    env.MAIL_FROM = "Natale <test@example.com>";
    const send = () =>
      api(
        `/events/${e.id}/invites`,
        "POST",
        { emails: ["bea@example.com"] },
        admin,
      );
    expect((await send()).data.queued).toBe(1);
    expect((await send()).data.queued).toBe(0);
    const old = await env.DB.prepare(
      "SELECT token FROM invites WHERE event_id=?",
    )
      .bind(e.id)
      .first();
    await api(`/events/${e.id}/rotate-invite`, "POST", {}, admin);
    expect((await send()).data.queued).toBe(1);
    const fresh = await env.DB.prepare(
      "SELECT token FROM invites WHERE event_id=?",
    )
      .bind(e.id)
      .first();
    expect(fresh.token).not.toBe(old.token);
    await env.DB.prepare("UPDATE invites SET state='failed' WHERE event_id=?")
      .bind(e.id)
      .run();
    expect((await send()).data.queued).toBe(1);
    expect(
      (
        await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM outbox WHERE event_id=?",
        )
          .bind(e.id)
          .first()
      ).n,
    ).toBe(3);
  });
  it("modifica date e budget con controllo versione e rifiuta le modifiche obsolete", async () => {
    const admin = await login("anna@example.com"),
      e = await event(admin);
    const update = {
      ...e,
      description: "Ci vediamo per una fetta di panettone.",
      budget: 30,
      name: "Natale insieme",
      historyDepth: 2,
      version: e.version,
    };
    expect((await api(`/events/${e.id}`, "PUT", update, admin)).status).toBe(
      200,
    );
    expect(
      (await api(`/events/${e.id}`, "GET", null, admin)).data.event,
    ).toMatchObject({
      name: update.name,
      budget: 30,
      historyDepth: 2,
      version: e.version + 1,
    });
    expect((await api(`/events/${e.id}`, "PUT", update, admin)).status).toBe(
      409,
    );
  });
  it("un annullamento obsoleto lascia intatti estrazione e messaggi", async () => {
    const admin = await login("anna@example.com"),
      e = await event(admin),
      cookies = [
        admin,
        await login("bea@example.com"),
        await login("carlo@example.com"),
      ];
    for (const c of cookies)
      await api(`/events/${e.id}/join`, "POST", { token: e.inviteToken }, c);
    for (const m of (await api(`/events/${e.id}`, "GET", null, admin)).data
      .members)
      await api(
        `/events/${e.id}/members/${m.id}`,
        "POST",
        { status: "approved" },
        admin,
      );
    await api(`/events/${e.id}/draw`, "POST", {}, admin);
    const current = (await api(`/events/${e.id}`, "GET", null, admin)).data
      .event;
    expect(
      (
        await api(
          `/events/${e.id}/cancel`,
          "POST",
          { reason: "Ritiro", version: current.version - 1 },
          admin,
        )
      ).status,
    ).toBe(409);
    expect(
      (await api(`/events/${e.id}`, "GET", null, admin)).data.event.status,
    ).toBe("drawn");
    expect(
      (
        await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM outbox WHERE event_id=? AND state='queued'",
        )
          .bind(e.id)
          .first()
      ).n,
    ).toBe(3);
    expect(
      (
        await api(
          `/events/${e.id}/cancel`,
          "POST",
          { reason: "Ritiro", version: current.version },
          admin,
        )
      ).status,
    ).toBe(200);
  });
  it("limita lo storico automatico e permette di cancellare gli abbinamenti importati", async () => {
    const admin = await login("anna@example.com"),
      e = await event(admin);
    await api(
      `/events/${e.id}/history`,
      "POST",
      {
        pairs: [
          { giverEmail: "anna@example.com", receiverEmail: "bea@example.com" },
        ],
      },
      admin,
    );
    expect(
      (await api(`/events/${e.id}/clear-history`, "POST", {}, admin)).status,
    ).toBe(200);
    expect(
      (await env.DB.prepare("SELECT COUNT(*) AS n FROM history").first()).n,
    ).toBe(0);
    const db = env.DB,
      group = (
        await db
          .prepare("SELECT group_id FROM events WHERE id=?")
          .bind(e.id)
          .first()
      ).group_id;
    await db
      .prepare(
        "INSERT INTO users(id,email,name) VALUES('bea','bea@example.com','Bea'),('carlo','carlo@example.com','Carlo')",
      )
      .run();
    const owner = (
      await db
        .prepare("SELECT owner_id FROM events WHERE id=?")
        .bind(e.id)
        .first()
    ).owner_id;
    for (const [key, created] of [
      ["old1", "2024-01-01"],
      ["old2", "2025-01-01"],
    ]) {
      await db
        .prepare(
          "INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,status,version,invite_token,created_at) VALUES(?,?,?,'Passato',20,'','','','','drawn',1,?,?)",
        )
        .bind(key, owner, group, key, created)
        .run();
      await db
        .prepare(
          "INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES(?,?,?,'approved',''),(?,?,?,'approved','')",
        )
        .bind(
          key + "a",
          key,
          owner,
          key + "b",
          key,
          key === "old1" ? "bea" : "carlo",
        )
        .run();
      await db
        .prepare(
          "INSERT INTO assignments(event_id,version,giver_id,receiver_id) VALUES(?,1,?,?)",
        )
        .bind(key, key + "a", key + "b")
        .run();
    }
    const raw = await db
        .prepare("SELECT * FROM events WHERE id=?")
        .bind(e.id)
        .first(),
      members = [
        { id: "a", email: "anna@example.com" },
        { id: "b", email: "bea@example.com" },
        { id: "c", email: "carlo@example.com" },
      ];
    expect(
      await historicalRules(db, { ...raw, history_depth: 1 }, members),
    ).toEqual([{ giverId: "a", receiverId: "c", type: "exclude" }]);
    expect(
      await historicalRules(db, { ...raw, history_depth: 2 }, members),
    ).toHaveLength(2);
    expect(
      await historicalRules(db, { ...raw, history_depth: 0 }, members),
    ).toEqual([]);
  });
});
