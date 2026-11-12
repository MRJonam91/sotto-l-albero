import { test, expect, request } from "@playwright/test";
const contexts = [];
const clients = new Map();
async function client(email, name) {
  if (clients.has(email)) return clients.get(email);
  const c = await request.newContext({
    baseURL: process.env.QA_BASE_URL || "http://127.0.0.1:8790",
  });
  contexts.push(c);
  const res = await c.post("/api/auth/request", {
    data: { email, name, phone: "+393200000000" },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const { devCode } = await res.json();
  expect(devCode).toBeTruthy();
  const verify = await c.post("/api/auth/verify", {
    data: { email, code: devCode },
  });
  expect(verify.ok(), await verify.text()).toBeTruthy();
  clients.set(email, c);
  return c;
}
test.afterAll(async () => {
  await Promise.all(contexts.map((c) => c.dispose()));
});
test("Evento completo: inviti, desideri riservati, vincoli, estrazione concorrente e archivio", async () => {
  const stamp = Date.now();
  const admin = await client("admin@example.test", "Organizzatore");
  const people = await Promise.all(
    [0, 1, 2].map((i) =>
      client(
        `persona${i}-${stamp}@example.test`,
        ["Anna", "Bruno", "Carla"][i],
      ),
    ),
  );
  const outsider = await client(`ospite-${stamp}@example.test`, "Ospite");
  const day = 86400000;
  const created = await admin.post("/api/events", {
    data: {
      name: `Natale di prova ${stamp}`,
      groupName: `Amici ${stamp}`,
      budget: 25,
      closeAt: new Date(Date.now() + day).toISOString(),
      drawAt: new Date(Date.now() + day * 2).toISOString(),
      giftAt: new Date(Date.now() + day * 10).toISOString(),
      description: "Ci troviamo per scambiarci i regali.",
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const { event } = await created.json();
  let detail = await (await admin.get(`/api/events/${event.id}`)).json();
  const token = detail.event.inviteToken;
  expect(token).toBeTruthy();
  expect((await outsider.get(`/api/events/${event.id}`)).status()).toBe(403);
  const publicInvite = await (
    await outsider.get(`/api/invite/${token}`)
  ).json();
  expect(publicInvite.event.name).toBe(event.name);
  expect(JSON.stringify(publicInvite)).not.toContain("admin@example.test");
  for (const c of people) {
    expect(
      (await c.post(`/api/events/${event.id}/join`, { data: { token } })).ok(),
    ).toBeTruthy();
  }
  detail = await (await admin.get(`/api/events/${event.id}`)).json();
  expect(detail.members).toHaveLength(3);
  for (const m of detail.members) {
    expect(
      (
        await admin.post(`/api/events/${event.id}/members/${m.id}`, {
          data: { status: "approved" },
        })
      ).ok(),
    ).toBeTruthy();
  }
  for (let i = 0; i < people.length; i++) {
    expect(
      (
        await people[i].put(`/api/events/${event.id}/wishlist`, {
          data: {
            items: [
              {
                type: "riddle",
                title: `Un libro per ${i}`,
                description: "Mi piacciono i gialli.",
                url: "https://example.com/libro",
                hint: "Si legge sul divano.",
                answer: "Un romanzo",
              },
            ],
          },
        })
      ).ok(),
    ).toBeTruthy();
  }
  const personal = await (
    await people[0].get(`/api/events/${event.id}`)
  ).json();
  expect(personal.wishlist[0].title).toBe("Un libro per 0");
  expect(personal.recipient).toBeFalsy();
  expect(personal.assignments).toBeUndefined();
  expect(personal.event.inviteToken).toBeFalsy();
  expect(personal.members.some((m) => m.email)).toBeFalsy();
  detail = await (await admin.get(`/api/events/${event.id}`)).json();
  const closure = await admin.put(`/api/events/${event.id}`, {
    data: {
      ...detail.event,
      closeAt: new Date(Date.now() - day).toISOString(),
    },
  });
  expect(closure.ok(), await closure.text()).toBeTruthy();
  const anonymous = await request.newContext({
    baseURL: process.env.QA_BASE_URL || "http://127.0.0.1:8790",
  });
  contexts.push(anonymous);
  expect(
    await (await anonymous.get(`/api/invite/${token}`)).json(),
  ).toMatchObject({
    event: null,
    membership: null,
    closed: true,
    requiresSignIn: true,
  });
  for (const c of people) {
    const reopened = await c.get(`/api/invite/${token}`);
    expect(reopened.ok(), await reopened.text()).toBeTruthy();
    expect(await reopened.json()).toMatchObject({
      event: { id: event.id },
      membership: "approved",
      closed: true,
    });
    expect(
      (await c.post(`/api/events/${event.id}/join`, { data: { token } })).ok(),
    ).toBeTruthy();
    expect(
      (await (await c.get("/api/events")).json()).events.some(
        (e) => e.id === event.id,
      ),
    ).toBeTruthy();
  }
  expect((await outsider.get(`/api/invite/${token}`)).status()).toBe(404);
  expect(
    (
      await outsider.post(`/api/events/${event.id}/join`, { data: { token } })
    ).status(),
  ).toBe(400);
  expect(
    (
      await people[0].post(`/api/events/${event.id}/draw`, { data: {} })
    ).status(),
  ).toBe(403);
  const [a, b] = detail.members;
  expect(
    (
      await admin.put(`/api/events/${event.id}/rules`, {
        data: { rules: [{ giverId: a.id, receiverId: b.id, type: "fixed" }] },
      })
    ).ok(),
  ).toBeTruthy();
  const draws = await Promise.all([
    admin.post(`/api/events/${event.id}/draw`, { data: {} }),
    admin.post(`/api/events/${event.id}/draw`, { data: {} }),
  ]);
  expect(draws.some((r) => r.ok())).toBeTruthy();
  const path = `/api/events/${event.id}`;
  const sealed = await (await admin.get(path)).json();
  expect(
    await (await people[0].get(`/api/invite/${token}`)).json(),
  ).toMatchObject({
    event: { id: event.id },
    membership: "approved",
    closed: true,
  });
  const version = sealed.event.version;
  expect(sealed.assignments).toBeUndefined();
  detail = await (
    await admin.post(`${path}/assignments`, {
      data: { version, confirm: true },
    })
  ).json();
  expect(detail.assignments).toHaveLength(3);
  expect(new Set(detail.assignments.map((p) => p.receiverId)).size).toBe(3);
  expect(
    detail.assignments.every((p) => p.giverId !== p.receiverId),
  ).toBeTruthy();
  expect(detail.assignments.find((p) => p.giverId === a.id).receiverId).toBe(
    b.id,
  );
  for (const c of people) {
    expect((await (await c.get(path)).json()).recipient).toBeUndefined();
    const first = await (
      await c.post(`${path}/recipient`, { data: { version } })
    ).json();
    const again = await (
      await c.post(`${path}/recipient`, { data: { version } })
    ).json();
    expect(first.recipient).toBeTruthy();
    expect(first.recipient).toEqual(again.recipient);
    expect(first.recipient.wishlist).toHaveLength(1);
    expect(first.assignments).toBeUndefined();
  }
  const change = await admin.put(`/api/events/${event.id}/rules`, {
    data: { rules: [] },
  });
  expect(change.status()).toBe(409);
  const normal = await (await admin.get(`/api/events/${event.id}`)).json();
  expect(normal.assignments).toBeUndefined();
  expect(
    (await admin.post(`/api/events/${event.id}/archive`, { data: {} })).ok(),
  ).toBeTruthy();
  expect(
    await (await people[0].get(`/api/invite/${token}`)).json(),
  ).toMatchObject({
    event: { id: event.id },
    membership: "approved",
    closed: true,
  });
});

test("Un account normale crea il proprio evento senza ottenere privilegi sugli altri", async () => {
  const stamp = Date.now();
  const owner = await client("admin@example.test", "Organizzatore");
  const regular = await client(`creatore-${stamp}@example.test`, "Creatore");
  expect((await (await regular.get("/api/me")).json()).user.organizer).toBe(
    false,
  );
  const day = 86400000;
  const data = {
    name: "Il mio primo Natale",
    budget: 15,
    closeAt: new Date(stamp + day).toISOString(),
    drawAt: new Date(stamp + day * 2).toISOString(),
    giftAt: new Date(stamp + day * 10).toISOString(),
  };
  const created = await regular.post("/api/events", { data });
  expect(created.status(), await created.text()).toBe(201);
  const own = (await created.json()).event;
  expect(own.isAdmin).toBeTruthy();
  expect((await (await regular.get("/api/me")).json()).user.organizer).toBe(
    false,
  );
  const other = (
    await (
      await owner.post("/api/events", {
        data: { ...data, name: "Evento di un altro" },
      })
    ).json()
  ).event;
  expect(
    (
      await regular.post(`/api/events/${other.id}/join`, {
        data: { token: other.inviteToken },
      })
    ).ok(),
  ).toBeTruthy();
  for (const action of ["duplicate", "rotate-invite", "draw", "archive"])
    expect(
      (
        await regular.post(`/api/events/${other.id}/${action}`, { data: {} })
      ).status(),
    ).toBe(403);
  expect(
    (
      await regular.post(`/api/events/${own.id}/duplicate`, { data: {} })
    ).status(),
  ).toBe(201);
});
test("Gruppi da 3, 5, 10, 15 e 20 ricevono tutti un nome distinto e stabile", async () => {
  const stamp = Date.now();
  const admin = await client("admin@example.test", "Organizzatore");
  const people = await Promise.all(
    Array.from({ length: 20 }, async (_, index) => {
      const name = `Partecipante ${index + 1}`;
      return {
        name,
        session: await client(
          `estrazione-${stamp}-${index}@example.test`,
          name,
        ),
      };
    }),
  );
  const day = 86400000;
  for (const size of [3, 5, 10, 15, 20]) {
    await test.step(`${size} partecipanti`, async () => {
      const group = people.slice(0, size);
      const created = await admin.post("/api/events", {
        data: {
          name: `Estrazione di prova ${size}`,
          groupName: `Gruppo ${size} ${stamp}`,
          budget: 20,
          closeAt: new Date(stamp + day).toISOString(),
          drawAt: new Date(stamp + 2 * day).toISOString(),
          giftAt: new Date(stamp + 10 * day).toISOString(),
        },
      });
      expect(created.ok(), await created.text()).toBeTruthy();
      const { event } = await created.json();
      const path = `/api/events/${event.id}`;
      for (const { session } of group) {
        expect(
          (
            await session.post(`${path}/join`, {
              data: { token: event.inviteToken },
            })
          ).ok(),
        ).toBeTruthy();
      }
      const { members } = await (await admin.get(path)).json();
      expect(members).toHaveLength(size);
      for (const member of members) {
        expect(
          (
            await admin.post(`${path}/members/${member.id}`, {
              data: { status: "approved" },
            })
          ).ok(),
        ).toBeTruthy();
      }

      expect(
        (await admin.post(`${path}/draw`, { data: {} })).ok(),
      ).toBeTruthy();
      const { event: drawn } = await (await admin.get(path)).json();
      const version = drawn.version;
      const { assignments } = await (
        await admin.post(`${path}/assignments`, {
          data: { version, confirm: true },
        })
      ).json();
      const expectedIds = members.map(({ id }) => id).sort();
      expect(assignments.map(({ giverId }) => giverId).sort()).toEqual(
        expectedIds,
      );
      expect(assignments.map(({ receiverId }) => receiverId).sort()).toEqual(
        expectedIds,
      );
      const names = new Map(members.map(({ id, name }) => [id, name]));
      const recipients = new Map(
        assignments.map(({ giverId, receiverId }) => [
          names.get(giverId),
          names.get(receiverId),
        ]),
      );
      for (const { name, session } of group) {
        expect(
          (await (await session.get(path)).json()).recipient,
        ).toBeUndefined();
        const detail = await (
          await session.post(`${path}/recipient`, { data: { version } })
        ).json();
        expect(detail.recipient.name).toBe(recipients.get(name));
        expect(detail.recipient.name).not.toBe(name);
        expect(detail.assignments).toBeUndefined();
      }
      expect(
        (await admin.post(`${path}/draw`, { data: {} })).ok(),
      ).toBeTruthy();
      expect(
        (
          await (
            await admin.post(`${path}/assignments`, {
              data: { version, confirm: true },
            })
          ).json()
        ).assignments,
      ).toEqual(assignments);
    });
  }
});

test("La rotazione del link revoca quello precedente e gli URL pericolosi sono respinti", async () => {
  const admin = await client("admin@example.test", "Organizzatore");
  const d = Date.now(),
    day = 86400000;
  const { event } = await (
    await admin.post("/api/events", {
      data: {
        name: "Invito da revocare",
        budget: 10,
        groupName: `Revoca ${d}`,
        closeAt: new Date(d + day).toISOString(),
        drawAt: new Date(d + 2 * day).toISOString(),
        giftAt: new Date(d + 3 * day).toISOString(),
      },
    })
  ).json();
  const detail = await (await admin.get(`/api/events/${event.id}`)).json();
  const old = detail.event.inviteToken;
  const rotation = await admin.post(`/api/events/${event.id}/rotate-invite`, {
    data: {},
  });
  expect(rotation.ok()).toBeTruthy();
  expect((await admin.get(`/api/invite/${old}`)).status()).toBe(404);
  const c = await client(`unsafe-${d}@example.test`, "Nome");
  const { token } = await rotation.json();
  await c.post(`/api/events/${event.id}/join`, { data: { token } });
  const updated = await (await admin.get(`/api/events/${event.id}`)).json();
  await admin.post(`/api/events/${event.id}/members/${updated.members[0].id}`, {
    data: { status: "approved" },
  });
  expect(
    (
      await c.put(`/api/events/${event.id}/wishlist`, {
        data: {
          items: [
            { type: "object", title: "Link", url: "javascript:alert(1)" },
          ],
        },
      })
    ).status(),
  ).toBe(400);
});
test("Il cron estrae senza browser e un annullamento vecchio non cambia la nuova estrazione", async () => {
  const admin = await client("admin@example.test", "Organizzatore");
  const d = Date.now(),
    day = 86400000;
  const result = await admin.post("/api/events", {
    data: {
      name: "Estrazione programmata",
      budget: 20,
      closeAt: new Date(d + day).toISOString(),
      drawAt: new Date(d + 2 * day).toISOString(),
      giftAt: new Date(d + 3 * day).toISOString(),
    },
  });
  expect(result.ok()).toBeTruthy();
  const { event } = await result.json();
  let data = await (await admin.get(`/api/events/${event.id}`)).json();
  for (let i = 0; i < 3; i++) {
    const c = await client(`cron-${d}-${i}@example.test`, `Amico ${i}`);
    await c.post(`/api/events/${event.id}/join`, {
      data: { token: data.event.inviteToken },
    });
  }
  data = await (await admin.get(`/api/events/${event.id}`)).json();
  for (const m of data.members)
    await admin.post(`/api/events/${event.id}/members/${m.id}`, {
      data: { status: "approved" },
    });
  data = await (await admin.get(`/api/events/${event.id}`)).json();
  expect(
    (
      await admin.put(`/api/events/${event.id}`, {
        data: {
          ...data.event,
          closeAt: new Date(d - day).toISOString(),
          drawAt: new Date(d - 60000).toISOString(),
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await admin.get("/cdn-cgi/local/scheduled")).ok()).toBeTruthy();
  await expect
    .poll(
      async () =>
        (await (await admin.get(`/api/events/${event.id}`)).json()).event
          .status,
    )
    .toBe("drawn");
  data = await (await admin.get(`/api/events/${event.id}`)).json();
  const oldVersion = data.event.version;
  expect(
    (
      await admin.post(`/api/events/${event.id}/cancel`, {
        data: { reason: "Sostituiamo un partecipante", version: oldVersion },
      })
    ).ok(),
  ).toBeTruthy();
  data = await (await admin.get(`/api/events/${event.id}`)).json();
  expect(
    (
      await admin.put(`/api/events/${event.id}`, {
        data: {
          ...data.event,
          closeAt: new Date(d + day).toISOString(),
          drawAt: new Date(d + 2 * day).toISOString(),
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await admin.post(`/api/events/${event.id}/draw`, { data: {} })).ok(),
  ).toBeTruthy();
  expect(
    (
      await admin.post(`/api/events/${event.id}/cancel`, {
        data: { reason: "Richiesta vecchia", version: oldVersion },
      })
    ).status(),
  ).toBe(409);
  expect(
    (await (await admin.get(`/api/events/${event.id}`)).json()).event.status,
  ).toBe("drawn");
});
