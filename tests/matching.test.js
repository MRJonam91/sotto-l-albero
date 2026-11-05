import { describe, it, expect } from "vitest";
import { matchParticipants } from "../worker/matching.js";
import {
  isLocalRequest,
  validEmail,
  safeText,
  safeUrl,
} from "../worker/security.js";

describe("abbinamenti", () => {
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
