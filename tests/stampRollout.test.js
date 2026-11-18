import { describe, expect, it } from "vitest";
import { buildStampRelease } from "../shared/stampRollout.js";

const event = (gift_at, extra = {}) => ({
  id: "event",
  name: "Natale",
  created_at: "2026-11-01T12:00:00Z",
  gift_at,
  ...extra,
});
const release = (gift, now = "2026-11-18T12:00:00Z", extra = {}) =>
  buildStampRelease({
    startDate: "2026-11-18",
    events: [event(gift)],
    now,
    ...extra,
  });

describe("Christmas stamp calendar release", () => {
  it("releases all ten immediately when opening gifts tomorrow or today", () => {
    for (const gift of ["2026-11-19", "2026-11-18"]) {
      const result = release(gift);
      expect(result.availableCount).toBe(10);
      expect(result.unlocks.every(({ date }) => date === "2026-11-18")).toBe(
        true,
      );
      expect(result.nextDate).toBe(null);
    }
  });

  it("releases one per day over ten days, with the last before gift opening", () => {
    const result = release("2026-11-28");
    expect(result.availableIds).toEqual(["office_ipod"]);
    expect(result.unlocks.map(({ date }) => date)).toEqual([
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
    ]);
    expect(result.nextDate).toBe("2026-11-19");
    expect(release("2026-11-28", "2026-11-27T12:00:00Z").availableCount).toBe(
      10,
    );
    expect(release("2026-11-28", "2027-01-01T12:00:00Z").availableCount).toBe(
      10,
    );
  });

  it("releases one every two days over twenty days", () => {
    const result = release("2026-12-08", "2026-11-20T12:00:00Z");
    expect(result.availableIds).toEqual(["office_ipod", "polar_bell"]);
    expect(result.unlocks.at(-1).date).toBe("2026-12-06");
    expect(result.nextDate).toBe("2026-11-22");
  });

  it("uses Rome calendar midnights across both daylight-saving changes", () => {
    const spring = release("2026-04-07", "2026-03-28T23:00:00Z", {
      startDate: "2026-03-28",
      events: [event("2026-04-07", { created_at: "2026-03-01" })],
    });
    expect(spring.availableCount).toBe(2);
    expect(spring.nextDate).toBe("2026-03-30");
    const fall = release("2026-11-03", "2026-10-25T22:59:59Z", {
      startDate: "2026-10-24",
      events: [event("2026-11-03", { created_at: "2026-10-01" })],
    });
    expect(fall.availableCount).toBe(2);
    expect(fall.nextDate).toBe("2026-10-26");
  });

  it("keeps a future launch locked and compresses events created after launch", () => {
    expect(release("2026-11-28", "2026-11-17T22:59:59Z")).toMatchObject({
      availableCount: 0,
      nextDate: "2026-11-18",
    });
    const result = release("2026-11-28", "2026-11-25T12:00:00Z", {
      events: [event("2026-11-28", { created_at: "2026-11-24T23:30:00Z" })],
    });
    expect(result.startDate).toBe("2026-11-25");
    expect(result.availableCount).toBe(4);
    expect(result.unlocks.at(-1).date).toBe("2026-11-27");
  });

  it.each([undefined, "", "bad", "2026-02-30", "2026-11-18T00:00:00Z"])(
    "disables invalid launch date %s",
    (startDate) => {
      expect(release("2026-11-28", undefined, { startDate })).toMatchObject({
        enabled: false,
        availableIds: [],
        unlocks: [],
        nextDate: null,
      });
    },
  );

  it("ignores invalid gift dates and tolerates legacy invalid creation dates", () => {
    expect(release("bad")).toMatchObject({
      enabled: true,
      availableCount: 0,
      eventName: null,
      giftDate: null,
    });
    expect(
      release("2026-11-28", undefined, {
        events: [event("2026-11-28", { created_at: "" })],
      }),
    ).toMatchObject({ startDate: "2026-11-18", availableCount: 1 });
  });

  it("keeps the earliest eligible gift headline with deterministic creation/id ties", () => {
    const events = [
      event("2026-11-30", { id: "late", name: "Later" }),
      event("2026-11-28", { id: "b", name: "B" }),
      event("2026-11-28", { id: "a", name: "A" }),
    ];
    expect(release(null, "2026-11-28T12:00:00Z", { events }).eventName).toBe(
      "A",
    );
    expect(release(null, "2026-12-01T12:00:00Z", { events }).eventName).toBe(
      "A",
    );
    events.push(
      event("2026-11-28", {
        id: "z",
        name: "Earlier creation",
        created_at: "2026-10-01",
      }),
    );
    expect(release(null, "2026-11-28T12:00:00Z", { events }).eventName).toBe(
      "Earlier creation",
    );
  });

  it("does not unlock a new collection through an edition predating launch", () => {
    expect(release("2025-12-25")).toMatchObject({
      availableCount: 0,
      eventName: null,
      giftDate: null,
      unlocks: [],
    });
  });

  it("unions eligible schedules and does not relock when the first gift date passes", () => {
    const events = [
      event("2026-11-20", { name: "Soon" }),
      event("2026-12-08", { id: "later" }),
    ];
    expect(
      release(null, "2026-11-20T12:00:00Z", { events }).availableCount,
    ).toBe(10);
    expect(
      release(null, "2026-11-21T12:00:00Z", { events }).availableCount,
    ).toBe(10);
    const differentStarts = [
      event("2026-11-28", { created_at: "2026-11-25" }),
      event("2026-12-08", { id: "later" }),
    ];
    const result = release(null, "2026-11-20T12:00:00Z", {
      events: differentStarts,
    });
    expect(result.availableIds).toEqual(["office_ipod", "polar_bell"]);
    expect(result.unlocks.at(-1).date).toBe("2026-11-27");
    expect(result.nextDate).toBe("2026-11-22");
  });
});
