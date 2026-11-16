import { describe, it, expect, vi } from "vitest";
import { matchParticipants } from "../worker/matching.js";
import {
  isLocalRequest,
  validEmail,
  safeText,
  safeUrl,
} from "../worker/security.js";

describe("abbinamenti", () => {
  it("non favorisce certi abbinamenti validi in un gruppo di quattro", () => {
    let seed = 0x5eeda1;
    const random = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation((values) => {
        for (let i = 0; i < values.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          values[i] = seed ^ (seed >>> 16);
        }
        return values;
      });
    try {
      const ids = ["a", "b", "c", "d"];
      const counts = new Map();
      for (let trial = 0; trial < 9000; trial++) {
        const receivers = new Map(
          matchParticipants(ids).map(({ giverId, receiverId }) => [
            giverId,
            receiverId,
          ]),
        );
        const outcome = ids.map((id) => receivers.get(id)).join("");
        counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
      }
      expect(counts.size).toBe(9);
      for (const count of counts.values()) {
        expect(count).toBeGreaterThanOrEqual(850);
        expect(count).toBeLessThanOrEqual(1150);
      }
    } finally {
      random.mockRestore();
    }
  });

  it("trova l’unico abbinamento possibile con venti partecipanti", () => {
    const ids = Array.from({ length: 20 }, (_, index) => String(index));
    const expected = ids.map((giverId, index) => ({
      giverId,
      receiverId: ids[(index + 1) % ids.length],
    }));
    const rules = expected.flatMap(({ giverId, receiverId }) =>
      ids
        .filter((id) => id !== receiverId && id !== giverId)
        .map((id) => ({ giverId, receiverId: id, type: "exclude" })),
    );
    expect(matchParticipants(ids, rules)).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it("assegna una sola volta tutti i destinatari senza auto-regali", () => {
    for (let n = 3; n <= 50; n++) {
      const ids = Array.from({ length: n }, (_, i) => String(i));
      for (let trial = 0; trial < 10; trial++) {
        const pairs = matchParticipants(ids, []);
        expect(pairs).toHaveLength(n);
        expect(new Set(pairs.map((x) => x.receiverId)).size).toBe(n);
        expect(pairs.every((x) => x.giverId !== x.receiverId)).toBe(true);
      }
    }
  });
  it("rispetta coppie fissate e divieti", () => {
    const pairs = matchParticipants(
      ["a", "b", "c", "d"],
      [
        { giverId: "a", receiverId: "b", type: "fixed" },
        { giverId: "b", receiverId: "a", type: "exclude" },
      ],
    );
    expect(pairs).toContainEqual({ giverId: "a", receiverId: "b" });
    expect(pairs).not.toContainEqual({ giverId: "b", receiverId: "a" });
  });
  it("rifiuta un sistema impossibile senza ignorare regole", () => {
    expect(() =>
      matchParticipants(
        ["a", "b", "c"],
        [
          { giverId: "a", receiverId: "b", type: "exclude" },
          { giverId: "b", receiverId: "a", type: "exclude" },
        ],
      ),
    ).toThrow(/regole/);
  });
  it("rifiuta coppie fissate in conflitto e persone estranee", () => {
    expect(() =>
      matchParticipants(
        ["a", "b", "c"],
        [
          { giverId: "a", receiverId: "b", type: "fixed" },
          { giverId: "c", receiverId: "b", type: "fixed" },
        ],
      ),
    ).toThrow();
    expect(() =>
      matchParticipants(
        ["a", "b", "c"],
        [{ giverId: "a", receiverId: "z", type: "fixed" }],
      ),
    ).toThrow();
  });
  it("rifiuta auto-regali fissati e gruppi troppo piccoli", () => {
    expect(() =>
      matchParticipants(
        ["a", "b", "c"],
        [{ giverId: "a", receiverId: "a", type: "fixed" }],
      ),
    ).toThrow();
    expect(() => matchParticipants(["a", "b"], [])).toThrow();
  });
});

describe("confini di accesso", () => {
  it("abilita il codice locale soltanto con modalità esplicita e URL loopback", () => {
    expect(
      isLocalRequest(new Request("http://127.0.0.1:8787/api/me"), {
        LOCAL_DEV: "true",
      }),
    ).toBe(true);
    expect(
      isLocalRequest(new Request("http://127.0.0.1:8787/api/me"), {}),
    ).toBe(false);
    expect(
      isLocalRequest(new Request("https://app.example/api/me"), {
        LOCAL_DEV: "true",
      }),
    ).toBe(false);
  });
  it("valida email, testo e collegamenti senza protocolli eseguibili", () => {
    expect(validEmail("  ANNA@example.com ")).toBe("anna@example.com");
    expect(() => validEmail("a@")).toThrow();
    expect(() => safeText("x".repeat(100), 20)).toThrow();
    expect(() => safeUrl("javascript:alert(1)")).toThrow();
    expect(safeUrl("https://example.com/book")).toBe(
      "https://example.com/book",
    );
  });
});
