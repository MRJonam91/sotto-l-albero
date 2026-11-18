import { beforeEach, describe, it, expect, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../worker/index.js";
import { drawEvent, scheduled, historicalRules } from "../worker/events.js";
import { holidayBadges, formatBadgeLabel } from "../shared/badges.js";

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
    "0012_stamp_ranking_cutoff.sql",
    "0013_practice_catalog.sql",
    "0014_tris_duels.sql",
    "0015_existing_email_notifications.sql",
    "0016_profile_identity_and_badges.sql",
    "0017_holiday_portrait_and_interactions.sql",
    "0018_practice_film_catalog.sql",
    "0019_amazon_preferences.sql",
    "0020_profile_activity.sql",
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
    cacheControl: response.headers.get("Cache-Control"),
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

async function readAssignments(path, organizer) {
  const { event } = (await api(path, "GET", null, organizer)).data;
  return api(
    `${path}/assignments`,
    "POST",
    { version: event.version, confirm: true },
    organizer,
  );
}
beforeEach(() => {
  env = { DB: database(), LOCAL_DEV: "true", APP_URL: "http://127.0.0.1:8787" };
});

describe("API privata", () => {
  it("restituisce solo la propria iscrizione nell’elenco per i collegamenti diretti", async () => {
    const owner = await login("owner-shortcuts@example.test");
    const member = await login("member-shortcuts@example.test");
    const e = await event(owner);
    expect(
      (
        await api(
          `/events/${e.id}/join`,
          "POST",
          { token: e.inviteToken },
          member,
        )
      ).status,
    ).toBe(200);
    const pending = (
      await api("/events", "GET", null, member)
    ).data.events.find((row) => row.id === e.id);
    expect(pending.membership).toBe("pending");
    await env.DB.prepare(
      "UPDATE members SET status='approved' WHERE event_id=?",
    )
      .bind(e.id)
      .run();
    expect(
      (await api("/events", "GET", null, member)).data.events.find(
        (row) => row.id === e.id,
      ).membership,
    ).toBe("approved");
    const owned = (await api("/events", "GET", null, owner)).data.events.find(
      (row) => row.id === e.id,
    );
    expect(owned.membership).toBe(null);
    expect(owned.isAdmin).toBe(true);
    await env.DB.prepare("UPDATE members SET status='removed' WHERE event_id=?")
      .bind(e.id)
      .run();
    expect(
      (await api("/events", "GET", null, member)).data.events.some(
        (row) => row.id === e.id,
      ),
    ).toBe(false);
  });
  it("riapre gli inviti dei membri dopo chiusura, estrazione e archivio senza riaprire le iscrizioni", async () => {
    const owner = await login("owner@example.test");
    const approved = await login("approved@example.test");
    const pending = await login("pending@example.test");
    const removed = await login("removed@example.test");
    const fresh = await login("fresh@example.test");
    const e = await event(owner);
    const path = `/events/${e.id}`;
    const invite = `/invite/${e.inviteToken}`;
    for (const cookie of [approved, pending, removed])
      expect(
        (await api(`${path}/join`, "POST", { token: e.inviteToken }, cookie))
          .status,
      ).toBe(200);
    await env.DB.prepare(
      "UPDATE members SET status='approved' WHERE event_id=? AND user_id=(SELECT id FROM users WHERE email='approved@example.test')",
    )
      .bind(e.id)
      .run();
    await env.DB.prepare(
      "UPDATE members SET status='removed' WHERE event_id=? AND user_id=(SELECT id FROM users WHERE email='removed@example.test')",
    )
      .bind(e.id)
      .run();
    expect((await api(invite, "GET", null, approved)).data.membership).toBe(
      "approved",
    );
    await env.DB.prepare(
      "UPDATE events SET close_at='2000-01-01T00:00:00.000Z' WHERE id=?",
    )
      .bind(e.id)
      .run();
    for (const status of ["open", "drawn", "archived"]) {
      await env.DB.prepare("UPDATE events SET status=? WHERE id=?")
        .bind(status, e.id)
        .run();
      expect((await api(invite, "GET", null, owner)).data).toMatchObject({
        event: { id: e.id },
        isOwner: true,
        closed: true,
      });
      expect(
        (await api(`${path}/join`, "POST", { token: e.inviteToken }, owner))
          .data,
      ).toMatchObject({ isOwner: true, membership: null });
      for (const [cookie, membership] of [
        [approved, "approved"],
        [pending, "pending"],
      ]) {
        const reopened = await api(invite, "GET", null, cookie);
        expect(reopened.status).toBe(200);
        expect(reopened.data).toMatchObject({
          event: { id: e.id },
          membership,
          closed: true,
        });
        expect(
          (await api(`${path}/join`, "POST", { token: e.inviteToken }, cookie))
            .data.membership,
        ).toBe(membership);
        expect(
          (await api("/events", "GET", null, cookie)).data.events.some(
            (x) => x.id === e.id,
          ),
        ).toBe(true);
        expect((await api(path, "GET", null, cookie)).status).toBe(200);
      }
      expect((await api(invite)).data).toMatchObject({
        event: null,
        membership: null,
        closed: true,
        requiresSignIn: true,
      });
      for (const cookie of [fresh, removed]) {
        expect((await api(invite, "GET", null, cookie)).status).toBe(404);
        expect(
          (await api(`${path}/join`, "POST", { token: e.inviteToken }, cookie))
            .status,
        ).toBe(400);
        expect((await api(path, "GET", null, cookie)).status).toBe(403);
      }
    }
    await env.DB.prepare(
      "UPDATE events SET invite_token='replacement-token' WHERE id=?",
    )
      .bind(e.id)
      .run();
    expect((await api(invite, "GET", null, approved)).status).toBe(404);
    expect(
      (await api(`${path}/join`, "POST", { token: e.inviteToken }, approved))
        .status,
    ).toBe(400);
    expect((await api(path, "GET", null, approved)).status).toBe(200);
    const counts = await env.DB.prepare(
      "SELECT status,COUNT(*) AS n FROM members WHERE event_id=? GROUP BY status ORDER BY status",
    )
      .bind(e.id)
      .all();
    expect(counts.results).toEqual([
      { status: "approved", n: 1 },
      { status: "pending", n: 1 },
      { status: "removed", n: 1 },
    ]);
  });

  it("permette agli account normali di creare e gestire solo i propri eventi", async () => {
    const owner = await login("owner@example.test");
    const regular = await login("regular@example.test");
    expect((await api("/me", "GET", null, regular)).data.user.organizer).toBe(
      false,
    );
    const own = await api(
      "/events",
      "POST",
      {
        name: "Il mio Natale",
        budget: 20,
        closeAt: "2099-12-01T18:00:00Z",
        drawAt: "2099-12-02T18:00:00Z",
        giftAt: "2099-12-24T18:00:00Z",
      },
      regular,
    );
    expect(own.status).toBe(201);
    expect(own.data.event.isAdmin).toBe(true);
    expect((await api("/me", "GET", null, regular)).data.user.organizer).toBe(
      false,
    );
    const foreign = await event(owner);
    await api(
      `/events/${foreign.id}/join`,
      "POST",
      { token: foreign.inviteToken },
      regular,
    );
    for (const action of ["duplicate", "rotate-invite", "draw", "archive"])
      expect(
        (await api(`/events/${foreign.id}/${action}`, "POST", {}, regular))
          .status,
      ).toBe(403);
    expect(
      (await api(`/events/${own.data.event.id}/duplicate`, "POST", {}, regular))
        .status,
    ).toBe(201);
  });

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
    expect(
      await env.DB.prepare(
        "SELECT notify_email,notify_telegram FROM users WHERE email=?",
      )
        .bind(email)
        .first(),
    ).toEqual({ notify_email: 1, notify_telegram: 0 });
    const updated = await api(
      "/profile",
      "PUT",
      { phone: "+39 320 000 0000" },
      session.cookie,
    );
    expect(updated.data.phone).toBe("+393200000000");
  });

  it("non riattiva l’email disabilitata quando un account esistente accede di nuovo", async () => {
    const email = "email-spenta@example.test";
    const firstCode = await api("/auth/request", "POST", {
      email,
      name: "Ada",
    });
    expect(
      (
        await api("/auth/verify", "POST", {
          email,
          code: firstCode.data.devCode,
        })
      ).status,
    ).toBe(200);
    await env.DB.prepare("UPDATE users SET notify_email=0 WHERE email=?")
      .bind(email)
      .run();
    const secondCode = await api("/auth/request", "POST", { email });
    expect(
      (
        await api("/auth/verify", "POST", {
          email,
          code: secondCode.data.devCode,
        })
      ).status,
    ).toBe(200);
    expect(
      await env.DB.prepare(
        "SELECT notify_email,notify_telegram FROM users WHERE email=?",
      )
        .bind(email)
        .first(),
    ).toEqual({ notify_email: 0, notify_telegram: 0 });
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
    expect(
      await env.DB.prepare(
        "SELECT notify_email,notify_telegram FROM users WHERE email=?",
      )
        .bind(email)
        .first(),
    ).toEqual({ notify_email: 1, notify_telegram: 0 });
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
    await env.DB.prepare("UPDATE users SET notify_email=0 WHERE email=?")
      .bind(email)
      .run();
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
      await env.DB.prepare(
        "SELECT notify_email,notify_telegram FROM users WHERE email=?",
      )
        .bind(email)
        .first(),
    ).toEqual({ notify_email: 0, notify_telegram: 0 });
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
      release: expect.objectContaining({ enabled: false }),
    });
    expect((await api("/stamps", "GET", null, luca)).data).toEqual({
      stamps: [],
      release: expect.objectContaining({ enabled: false }),
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
    ).toBe(400);
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
    const pending = await login("attesa@example.com");
    const path = `/events/${e.id}`;
    expect(
      (await api(`${path}/join`, "POST", { token: e.inviteToken }, pending))
        .data.membership,
    ).toBe("pending");
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
    const sealed = (await api(`/events/${e.id}`, "GET", null, cookies[1])).data;
    expect(sealed.recipient).toBeUndefined();
    const oldOwnerRead = (await api(`${path}?reveal=1`, "GET", null, admin))
      .data;
    expect(oldOwnerRead.assignments).toBeUndefined();
    expect(oldOwnerRead.rules).toEqual([]);
    const version = sealed.event.version;
    expect(
      (await api(`${path}/assignments`, "POST", { version }, admin)).status,
    ).toBe(400);
    const a = (await readAssignments(path, admin)).data;
    expect(a.assignments).toHaveLength(3);
    const b = (await api(`/events/${e.id}?reveal=1`, "GET", null, cookies[1]))
      .data;
    expect(b.assignments).toBeUndefined();
    expect(b.event.inviteToken).toBeUndefined();
    expect(b.rules).toEqual([]);
    expect(b.recipient).toBeUndefined();
    const pendingView = (await api(`${path}?reveal=1`, "GET", null, pending))
      .data;
    expect(pendingView.members.map((m) => m.name)).toEqual(["attesa"]);
    expect(pendingView.recipient).toBeUndefined();
    expect(pendingView.assignments).toBeUndefined();
    for (const c of [pending, stranger, ""]) {
      for (const endpoint of ["recipient", "assignments"]) {
        const denied = await api(
          `${path}/${endpoint}`,
          "POST",
          { version, confirm: true },
          c,
        );
        expect(denied.status).toBe(c ? 403 : 401);
        expect(denied.data).not.toHaveProperty("recipient");
        expect(denied.data).not.toHaveProperty("assignments");
      }
    }
    expect(
      (
        await api(
          `${path}/assignments`,
          "POST",
          { version, confirm: true },
          cookies[1],
        )
      ).status,
    ).toBe(403);
    const giver = oldOwnerRead.members.find((m) => m.name === "bea");
    const pair = a.assignments.find((item) => item.giverId === giver.id);
    const receiver = oldOwnerRead.members.find((m) => m.id === pair.receiverId);
    const own = await api(
      `${path}/recipient`,
      "POST",
      { version, giverId: pair.receiverId },
      cookies[1],
    );
    expect(own.cacheControl).toBe("no-store");
    expect(own.data.recipient.name).toBe(receiver.name);
    expect(own.data).not.toHaveProperty("assignments");
    expect((await api(`/events/${e.id}/draw`, "POST", {}, admin)).status).toBe(
      200,
    );
    expect((await readAssignments(path, admin)).data.assignments).toEqual(
      a.assignments,
    );
    expect(
      (await api(`/events/${e.id}/rules`, "PUT", { rules: [] }, admin)).status,
    ).toBe(409);
    expect(
      (
        await api(
          `${path}/cancel`,
          "POST",
          { version, reason: "Prova revoca" },
          admin,
        )
      ).status,
    ).toBe(200);
    expect(
      (await api(`${path}/recipient`, "POST", { version }, cookies[1])).status,
    ).toBe(409);
    expect(
      (
        await api(
          `${path}/assignments`,
          "POST",
          { version, confirm: true },
          admin,
        )
      ).status,
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
  it("ritenta l’estrazione programmata dopo un errore temporaneo del database", async () => {
    const admin = await login("anna@example.com");
    const e = await event(admin);
    for (const cookie of [
      admin,
      await login("bea@example.com"),
      await login("carlo@example.com"),
    ]) {
      await api(
        `/events/${e.id}/join`,
        "POST",
        { token: e.inviteToken },
        cookie,
      );
    }
    const { members } = (await api(`/events/${e.id}`, "GET", null, admin)).data;
    for (const member of members) {
      await api(
        `/events/${e.id}/members/${member.id}`,
        "POST",
        { status: "approved" },
        admin,
      );
    }
    await env.DB.prepare(
      "UPDATE events SET draw_at='2000-01-01T00:00:00.000Z' WHERE id=?",
    )
      .bind(e.id)
      .run();
    const batch = vi
      .spyOn(env.DB, "batch")
      .mockRejectedValueOnce(new Error("D1 temporaneamente indisponibile"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await scheduled(env);
      expect(
        await env.DB.prepare("SELECT status,error FROM events WHERE id=?")
          .bind(e.id)
          .first(),
      ).toEqual({ status: "open", error: null });
      expect(
        (await api(`/events/${e.id}?reveal=1`, "GET", null, admin)).data
          .assignments ?? [],
      ).toHaveLength(0);
      await scheduled(env);
      const { event: drawn } = (
        await api(`/events/${e.id}`, "GET", null, admin)
      ).data;
      const { assignments } = (await readAssignments(`/events/${e.id}`, admin))
        .data;
      expect(drawn.status).toBe("drawn");
      expect(assignments).toHaveLength(3);
    } finally {
      batch.mockRestore();
      log.mockRestore();
    }
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
  it.each([3, 5, 10, 15, 20])(
    "estrae tutti i %i partecipanti con regole e storico dopo aver risolto un conflitto",
    async (size) => {
      const admin = await login("anna@example.com");
      const people = [];
      for (let i = 0; i < size; i++) {
        const name = `persona-${i}`;
        const email = `${name}@example.test`;
        people.push({ name, email, cookie: await login(email) });
      }

      async function enroll(edition) {
        const path = `/events/${edition.id}`;
        for (const { cookie } of people) {
          expect(
            (
              await api(
                `${path}/join`,
                "POST",
                { token: edition.inviteToken },
                cookie,
              )
            ).status,
          ).toBe(200);
        }
        const { members } = (await api(path, "GET", null, admin)).data;
        expect(members).toHaveLength(size);
        const membersByName = new Map(
          members.map((member) => [member.name, member.id]),
        );
        for (const member of members) {
          expect(
            (
              await api(
                `${path}/members/${member.id}`,
                "POST",
                { status: "approved" },
                admin,
              )
            ).status,
          ).toBe(200);
        }
        return people.map(({ name }) => membersByName.get(name));
      }

      const prior = await event(admin);
      const priorPath = `/events/${prior.id}`;
      const priorIds = await enroll(prior);
      const priorRules = priorIds.map((giverId, index) => ({
        giverId,
        receiverId: priorIds[(index + 1) % size],
        type: "fixed",
      }));
      expect(
        (await api(`${priorPath}/rules`, "PUT", { rules: priorRules }, admin))
          .status,
      ).toBe(200);
      expect((await api(`${priorPath}/draw`, "POST", {}, admin)).status).toBe(
        200,
      );
      expect(
        (await api(`${priorPath}/archive`, "POST", {}, admin)).status,
      ).toBe(200);

      const duplicate = await api(
        `${priorPath}/duplicate`,
        "POST",
        { name: "Seconda edizione" },
        admin,
      );
      expect(duplicate.status).toBe(201);
      const current = duplicate.data.event;
      const path = `/events/${current.id}`;
      const ids = await enroll(current);
      const offset = size === 3 ? 1 : 2;
      const imported = {
        giverEmail: people[1].email,
        receiverEmail: people[(1 + offset) % size].email,
      };
      expect(
        (await api(`${path}/history`, "POST", { pairs: [imported] }, admin))
          .status,
      ).toBe(200);

      const conflictingRule = {
        giverId: ids[0],
        receiverId: ids[1],
        type: "fixed",
      };
      expect(
        (await api(`${path}/rules`, "PUT", { rules: [conflictingRule] }, admin))
          .status,
      ).toBe(200);
      const refused = await api(`${path}/draw`, "POST", {}, admin);
      expect(refused.status).toBe(400);
      expect(refused.data.error).toMatch(/conflitto/);
      const persisted = await env.DB.prepare(
        "SELECT status,(SELECT COUNT(*) FROM assignments WHERE event_id=e.id) AS assigned,(SELECT COUNT(*) FROM outbox WHERE event_id=e.id) AS queued FROM events e WHERE id=?",
      )
        .bind(current.id)
        .first();
      expect(persisted).toEqual({ status: "open", assigned: 0, queued: 0 });

      const validFixed = { ...conflictingRule, receiverId: ids.at(-1) };
      const explicitExclusion = {
        giverId: ids[2],
        receiverId: ids[(2 + offset) % size],
        type: "exclude",
      };
      expect(
        (
          await api(
            `${path}/rules`,
            "PUT",
            { rules: [validFixed, explicitExclusion] },
            admin,
          )
        ).status,
      ).toBe(200);
      expect((await api(`${path}/draw`, "POST", {}, admin)).status).toBe(200);
      const { event: drawn } = (await api(path, "GET", null, admin)).data;
      const { assignments } = (await readAssignments(path, admin)).data;
      expect(assignments).toHaveLength(size);
      const receivers = new Map(
        assignments.map(({ giverId, receiverId }) => [giverId, receiverId]),
      );
      expect([...receivers.keys()].sort()).toEqual(ids.toSorted());
      expect([...receivers.values()].sort()).toEqual(ids.toSorted());
      expect(receivers.get(ids[0])).toBe(validFixed.receiverId);
      expect(receivers.get(ids[1])).not.toBe(ids[(1 + offset) % size]);
      expect(receivers.get(ids[2])).not.toBe(explicitExclusion.receiverId);
      for (const [index, id] of ids.entries()) {
        const receiver = receivers.get(id);
        expect(receiver).not.toBe(id);
        expect(receiver).not.toBe(ids[(index + 1) % size]);
        const { recipient } = (
          await api(
            `${path}/recipient`,
            "POST",
            { version: drawn.version },
            people[index].cookie,
          )
        ).data;
        expect(recipient.name).toBe(people[ids.indexOf(receiver)].name);
      }
    },
  );

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

  it("permette di modificare il nome del gruppo e dello scambio", async () => {
    const admin = await login("admin-group@example.test");
    const guest = await login("guest-group@example.test");
    const e = await event(admin);
    expect(e.groupName).toBe("Natale tra amici");

    const edited = await api(
      `/events/${e.id}`,
      "PUT",
      {
        name: "Scambio 2026",
        groupName: "Compagnia delle Feste",
        budget: 30,
        description: "Ci vediamo alla vigilia",
        closeAt: "2099-12-01T18:00:00Z",
        drawAt: "2099-12-02T18:00:00Z",
        giftAt: "2099-12-24T18:00:00Z",
        historyDepth: 1,
        version: e.version,
      },
      admin,
    );
    expect(edited.status).toBe(200);
    expect(edited.data.event).toMatchObject({
      name: "Scambio 2026",
      groupName: "Compagnia delle Feste",
    });

    const forbidden = await api(
      `/events/${e.id}/rename`,
      "POST",
      { groupName: "Non autorizzato" },
      guest,
    );
    expect(forbidden.status).toBe(403);

    const renamed = await api(
      `/events/${e.id}/rename`,
      "POST",
      { groupName: "Amici di Sempre", name: "Natale sotto la neve" },
      admin,
    );
    expect(renamed.status).toBe(200);
    expect(renamed.data.event).toMatchObject({
      groupName: "Amici di Sempre",
      name: "Natale sotto la neve",
    });
  });

  it("permette di impostare nome, soprannome/username e una delle 10 targhettine natalizie nel profilo", async () => {
    expect(holidayBadges).toHaveLength(10);
    const admin = await login("anna-profilo@example.test");
    const member = await login("bruno-profilo@example.test");
    const e = await event(admin);
    await api(`/events/${e.id}/join`, "POST", { token: e.inviteToken }, member);

    for (const option of holidayBadges) {
      const res = await api(
        "/profile",
        "PUT",
        {
          name: "Bruno Stella",
          nickname: "elfo_bruno",
          badge: option.id,
          badgeText: "nickname",
        },
        member,
      );
      expect(res.status).toBe(200);
      expect(res.data).toMatchObject({
        name: "Bruno Stella",
        nickname: "elfo_bruno",
        badge: option.id,
        badgeText: "nickname",
      });
    }

    expect(
      formatBadgeLabel({
        name: "Bruno Stella",
        nickname: "elfo_bruno",
        badgeText: "nickname",
      }),
    ).toBe("elfo_bruno");
    expect(
      formatBadgeLabel({
        name: "Bruno Stella",
        nickname: "elfo_bruno",
        badgeText: "name",
      }),
    ).toBe("Bruno Stella");

    const invalidBadge = await api(
      "/profile",
      "PUT",
      { badge: "inesistente" },
      member,
    );
    expect(invalidBadge.status).toBe(400);

    const me = await api("/me", "GET", null, member);
    expect(me.data.user).toMatchObject({
      name: "Bruno Stella",
      nickname: "elfo_bruno",
      badge: "bells",
      badgeText: "nickname",
    });

    const eventDetails = await api(`/events/${e.id}`, "GET", null, admin);
    expect(eventDetails.data.members).toContainEqual(
      expect.objectContaining({
        name: "Bruno Stella",
        nickname: "elfo_bruno",
        badge: "bells",
        badgeText: "nickname",
      }),
    );
  });

  it("crea il ritratto natalizio con indovinello, attività, icone, domande del giorno, personaggi dei film e interazioni notificate", async () => {
    const admin = await login("anna-ritratto@example.test");
    const member = await login("kevin-ritratto@example.test");
    const e = await event(admin);
    await api(`/events/${e.id}/join`, "POST", { token: e.inviteToken }, member);
    const joinList = (await api(`/events/${e.id}`, "GET", null, admin)).data
      .members;
    const kevinMember = joinList.find((m) => m.name === "kevin-ritratto");
    await api(
      `/events/${e.id}/members/${kevinMember.id}`,
      "POST",
      { status: "approved" },
      admin,
    );

    const saved = await api(
      "/profile",
      "PUT",
      {
        name: "Kevin",
        nickname: "stratega_natalizio",
        badge: "reindeer",
        holidayProfile: {
          quote: "Tenete il resto! Io preparo i pacchetti.",
          activity: "Progetto trappole ingegnose alla Mamma ho perso l’aereo",
          iconMessage: ["home", "puzzle", "gift", "tree"],
          iconCaption: "Casa protetta e regali pronti!",
          riddle:
            "Sono bianco e rosso e ho la forma di un bastone da passeggio. Chi sono?",
          riddleHint: "Sa di menta",
          riddleAnswer: "Il bastoncino di zucchero",
          answers: {
            sweater: "kevin_red",
            soundtrack: "rock_jingle",
            treat: "gingerbread_cookies",
            wrapping: "puzzle_box",
            movie_night: "boardgames_friends",
          },
          customDescription: "",
          portraitApproved: true,
        },
      },
      member,
    );
    expect(saved.status).toBe(200);
    expect(saved.data.portrait.tastes).toHaveLength(5);
    expect(saved.data.portrait.characterMatches).toHaveLength(3);
    expect(
      saved.data.portrait.matchingExplanation.weights.map(
        (weight) => weight.effectiveWeight,
      ),
    ).toEqual([60, 25, 15]);
    expect(saved.data.portrait.finalDescription).toContain(
      saved.data.portrait.topCharacter.name,
    );

    // Verifica che nel gruppo il ritratto sia visibile ma la soluzione segreta dell'indovinello resti nascosta
    const groupView = (await api(`/events/${e.id}`, "GET", null, admin)).data;
    const kevinInGroup = groupView.members.find(
      (m) => m.nickname === "stratega_natalizio",
    );
    expect(kevinInGroup.holidayStatus).toMatchObject({
      quote: "Tenete il resto! Io preparo i pacchetti.",
      iconMessage: ["home", "puzzle", "gift", "tree"],
      hasRiddleAnswer: true,
    });
    expect(kevinInGroup.holidayStatus.riddleAnswer).toBeUndefined();
    expect(kevinInGroup.portrait.characterMatches).toEqual(
      saved.data.portrait.characterMatches,
    );
    expect(kevinInGroup.portrait.matchingExplanation.weights).toEqual(
      saved.data.portrait.matchingExplanation.weights,
    );
    expect(kevinInGroup.portrait.matchingExplanation.signals).toEqual([]);

    // L'organizzatrice prova a indovinare l'indovinello del giorno e invia un messaggio con icona
    const wrongGuess = await api(
      `/events/${e.id}/portrait-interact`,
      "POST",
      {
        targetUserId: kevinInGroup.userId,
        kind: "riddle_guess",
        message: "una stella",
      },
      admin,
    );
    expect(wrongGuess.status).toBe(200);
    expect(wrongGuess.data.correct).toBe(false);

    const rightGuess = await api(
      `/events/${e.id}/portrait-interact`,
      "POST",
      {
        targetUserId: kevinInGroup.userId,
        kind: "riddle_guess",
        message: "bastoncino di zucchero!",
      },
      admin,
    );
    expect(rightGuess.status).toBe(200);
    expect(rightGuess.data.correct).toBe(true);

    const iconNote = await api(
      `/events/${e.id}/portrait-interact`,
      "POST",
      {
        targetUserId: kevinInGroup.userId,
        kind: "icon_note",
        icon: "cookie",
        message: "Ti porto i biscotti alla cannella!",
      },
      admin,
    );
    expect(iconNote.status).toBe(200);

    // Verifica che le notifiche email siano state accodate in outbox
    const queuedMails = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM outbox WHERE email='kevin-ritratto@example.test'",
    ).first();
    expect(queuedMails.count).toBe(3);
  });

  it.each(["optout", "membership"])(
    "cancella la mail del ritratto se cambia %s prima dell’invio",
    async (change) => {
      const admin = await login("portrait-owner@example.test");
      const member = await login("portrait-member@example.test");
      const e = await event(admin);
      await api(
        `/events/${e.id}/join`,
        "POST",
        { token: e.inviteToken },
        member,
      );
      await env.DB.prepare(
        "UPDATE members SET status='approved' WHERE event_id=?",
      )
        .bind(e.id)
        .run();
      const target = await env.DB.prepare(
        "SELECT id FROM users WHERE email='portrait-member@example.test'",
      ).first();
      const result = await api(
        `/events/${e.id}/portrait-interact`,
        "POST",
        {
          targetUserId: target.id,
          kind: "icon_note",
          message: "Auguri!",
          icon: "tree",
        },
        admin,
      );
      expect(result.status).toBe(200);
      if (change === "optout")
        await env.DB.prepare("UPDATE users SET notify_email=0 WHERE id=?")
          .bind(target.id)
          .run();
      else
        await env.DB.prepare(
          "UPDATE members SET status='pending' WHERE event_id=? AND user_id=?",
        )
          .bind(e.id, target.id)
          .run();
      const provider = vi.fn(async () => Response.json({ id: "fake-mail" }));
      vi.stubGlobal("fetch", provider);
      try {
        await scheduled({
          ...env,
          RESEND_API_KEY: "fake",
          MAIL_FROM: "qa@example.test",
        });
        expect(provider).not.toHaveBeenCalled();
        expect(
          await env.DB.prepare("SELECT state FROM outbox WHERE id=?")
            .bind(result.data.interaction.id)
            .first(),
        ).toEqual({ state: "cancelled" });
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

  it("propone lo stato una sola volta al giorno senza conseguenze sulle affinità quando viene ignorato", async () => {
    const email = "checkin-giornaliero@example.test";
    const firstReq = await api("/auth/request", "POST", {
      email,
      name: "Marta",
    });
    const firstLogin = await api("/auth/verify", "POST", {
      email,
      code: firstReq.data.devCode,
    });
    expect(firstLogin.status).toBe(200);
    expect(firstLogin.data.user.dailyCheckin.pendingToday).toBe(true);

    const beforeSkip = (await api("/profile", "GET", null, firstLogin.cookie))
      .data;
    // Ignorare modifica soltanto lo stato del promemoria.
    const skipped = await api(
      "/profile/daily-checkin",
      "POST",
      { action: "skip" },
      firstLogin.cookie,
    );
    expect(skipped.status).toBe(200);
    expect(skipped.data.dailyCheckin).toMatchObject({
      pendingToday: false,
      lastPromptStatus: "skipped",
      skippedCount: 1,
    });
    expect(skipped.data.portrait.completeness).toBe(0);
    expect(skipped.data.portrait.confidenceLevel).toBe("bassa");
    expect(skipped.data.portrait.ignoredToday).toBe(true);
    expect(skipped.data.portrait.characterMatches).toEqual(
      beforeSkip.portrait.characterMatches,
    );
    expect(skipped.data.portrait.matchingExplanation).toEqual(
      beforeSkip.portrait.matchingExplanation,
    );
    expect(skipped.data.portrait.finalDescription).toContain("provvisorio");

    // Anche effettuando un nuovo login lo stesso giorno, non deve riproporre il check-in
    const secondReq = await api("/auth/request", "POST", { email });
    const secondLogin = await api("/auth/verify", "POST", {
      email,
      code: secondReq.data.devCode,
    });
    expect(secondLogin.status).toBe(200);
    expect(secondLogin.data.user.dailyCheckin.pendingToday).toBe(false);
    expect(secondLogin.data.user.dailyCheckin.lastPromptStatus).toBe("skipped");

    // Se poi completa il percorso guidato, l'affinità e la completezza salgono
    const completed = await api(
      "/profile/daily-checkin",
      "POST",
      {
        action: "complete",
        holidayProfile: {
          activity: "Cioccolata calda, coperta e maratona di film",
          quote:
            "Il modo migliore per diffondere lo spirito natalizio è cantare a squarciagola.",
          iconMessage: ["santa", "star", "cookie", "gift"],
          answers: {
            sweater: "reindeer_lights",
            soundtrack: "choir_classics",
            treat: "maple_candy",
            wrapping: "explosion_gold",
            movie_night: "lights_tour",
            tree_style: "colorful_fun",
            gift_mission: "group_cheer",
          },
          portraitApproved: true,
        },
      },
      secondLogin.cookie,
    );
    expect(completed.status).toBe(200);
    expect(completed.data.dailyCheckin).toMatchObject({
      pendingToday: false,
      lastPromptStatus: "completed",
      skippedCount: 0,
      completedCount: 1,
    });
    expect(completed.data.portrait.completeness).toBeGreaterThanOrEqual(80);
    expect(completed.data.portrait.confidenceLevel).toBe("alta");
    expect(completed.data.portrait.topCharacter.affinity).toBeGreaterThan(75);
  });

  it("salva una sola scelta del giorno, conserva i dati precedenti e usa la data del server", async () => {
    const cookie = await login("mood-preservation@example.test");
    await api(
      "/profile",
      "PUT",
      {
        holidayProfile: {
          quote: "La mia frase",
          customDescription: "Descrizione personale",
          portraitApproved: false,
          answers: { sweater: "kevin_red" },
          iconMessage: ["puzzle"],
        },
      },
      cookie,
    );
    const complete = await api(
      "/profile/daily-checkin",
      "POST",
      { action: "complete", moodId: "cocoa", date: "2099-01-01" },
      cookie,
    );
    expect(complete.status).toBe(200);
    expect(complete.data.holidayProfile).toMatchObject({
      quote: "La mia frase",
      customDescription: "Descrizione personale",
      portraitApproved: false,
      answers: { sweater: "kevin_red" },
      iconMessage: ["puzzle"],
      dailyMood: { id: "cocoa", date: complete.data.dailyCheckin.today },
    });
    expect(complete.data.holidayProfile.dailyMood.date).not.toBe("2099-01-01");
    const skip = await api(
      "/profile/daily-checkin",
      "POST",
      { action: "skip", moodId: "buddy" },
      cookie,
    );
    expect(skip.data.holidayProfile.dailyMood).toEqual(
      complete.data.holidayProfile.dailyMood,
    );
    expect(skip.data.portrait.characterMatches).toEqual(
      complete.data.portrait.characterMatches,
    );
    const invalid = await api(
      "/profile/daily-checkin",
      "POST",
      { action: "complete", moodId: "invented" },
      cookie,
    );
    expect(invalid.status).toBe(400);
    const after = await api("/profile", "GET", null, cookie);
    expect(after.data.holidayProfile.dailyMood.id).toBe("cocoa");
  });

  it.each([
    [
      "/profile",
      "PUT",
      {
        holidayProfile: {
          quote: "Nuova frase",
          answers: { wrapping: "puzzle_box" },
        },
      },
    ],
    [
      "/profile",
      "PUT",
      {
        dailyCheckinAction: "complete",
        holidayProfile: { quote: "Nuova frase" },
      },
    ],
    [
      "/profile/daily-checkin",
      "POST",
      {
        action: "complete",
        holidayProfile: { answers: { wrapping: "puzzle_box" } },
      },
    ],
    [
      "/profile",
      "PUT",
      { holidayProfile: { dailyMood: { id: "buddy", date: "2099-01-01" } } },
    ],
    [
      "/profile/daily-checkin",
      "POST",
      {
        action: "complete",
        holidayProfile: { dailyMood: { id: "buddy", date: "2099-01-01" } },
      },
    ],
  ])(
    "conserva il giorno dello stato precedente senza una scelta moodId esplicita: %s %s %j",
    async (path, method, payload) => {
      const cookie = await login("mood-date-preservation@example.test");
      const previous = {
        dailyMood: { id: "cocoa", date: "2026-11-17" },
        answers: { sweater: "kevin_red" },
      };
      await env.DB.prepare("UPDATE users SET holiday_profile=? WHERE email=?")
        .bind(JSON.stringify(previous), "mood-date-preservation@example.test")
        .run();
      const result = await api(path, method, payload, cookie);
      expect(result.status).toBe(200);
      expect(result.data.holidayProfile.dailyMood).toEqual({
        id: "cocoa",
        date: "2026-11-17",
      });
    },
  );

  it("costruisce lo stesso ritratto automatico dal server nel profilo e nel gruppo senza domande", async () => {
    const cookie = await login("automatic-matching@example.test");
    const e = await event(cookie);
    await api(`/events/${e.id}/join`, "POST", { token: e.inviteToken }, cookie);
    await env.DB.prepare(
      "INSERT INTO practice_games(user_id,game,revision,state,done) SELECT id,'quiz','saved','{\"score\":4}',1 FROM users WHERE email=?",
    )
      .bind("automatic-matching@example.test")
      .run();
    const own = (await api("/profile", "GET", null, cookie)).data;
    expect(own.portrait.answeredCount).toBe(0);
    expect(
      own.portrait.matchingExplanation.weights.map(
        (weight) => weight.effectiveWeight,
      ),
    ).toEqual([100, 0, 0]);
    expect(own.portrait.matchingExplanation.signals.join(" ")).toContain("80%");
    expect(own.context.activity.games).toEqual([
      { game: "quiz", count: 1, averageResult: 0.8 },
    ]);
    const group = (await api(`/events/${e.id}`, "GET", null, cookie)).data;
    expect(group.members[0].portrait.characterMatches).toEqual(
      own.portrait.characterMatches,
    );
    expect(group.members[0].portrait.matchingExplanation.signals).toEqual([]);
    expect(group.members[0].context).toBeUndefined();
  });
});
