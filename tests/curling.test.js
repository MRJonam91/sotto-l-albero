import { describe, expect, it, vi } from "vitest";
import { createCurlingGame, scoreGift } from "../src/curlingEngine.js";

describe("punteggio del curling dopo gli urti", () => {
  const gift = (x, y, out = false) => ({ body: { position: { x, y } }, out });
  it.each([
    [180, 122, 3],
    [211.9, 122, 3],
    [212, 122, 2],
    [241, 122, 1],
    [271, 122, 0],
    [180, 154, 2],
  ])(
    "assegna al centro (%s, %s) %s punti, con la linea esterna",
    (x, y, points) => {
      expect(scoreGift(gift(x, y))).toBe(points);
    },
  );
  it("rivaluta il regalo spostato da un urto e azzera un pacco eliminato", () => {
    const parcel = gift(180, 122);
    expect(scoreGift(parcel)).toBe(3);
    parcel.body.position.x = 245;
    expect(scoreGift(parcel)).toBe(1);
    parcel.out = true;
    expect(scoreGift(parcel)).toBe(0);
  });
});

// Canvas painting is a native-browser concern; exercise the real Matter physics
// and controller against a minimal mount surface without painting.
function mount() {
  const nodes = new Map();
  const node = (selector) => {
    if (!nodes.has(selector))
      nodes.set(selector, {
        value: selector === "[data-mode]" ? "cpu" : "",
        textContent: "",
        style: {},
        classList: { add() {}, remove() {} },
        querySelector: (child) => node(`${selector} ${child}`),
        getContext: () => ({}),
        width: 0,
        matches: () => false,
      });
    return nodes.get(selector);
  };
  const root = {
    dataset: {},
    querySelector: node,
    querySelectorAll: (selector) =>
      selector.split(",").map((part) => node(part.trim())),
    addEventListener() {},
  };
  return { root, node };
}

describe("curling contro il computer e partecipazione", () => {
  it("alterna Tu e Computer e notifica una sola volta solo una partita conclusa", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const { root, node } = mount();
    let completions = 0;
    const dispose = createCurlingGame(root, {
      onComplete: () => {
        completions++;
      },
    });
    try {
      expect(node("[data-turn]").textContent).toContain("Tu");
      expect(node("[data-score]").textContent).toContain("Computer");
      node("[data-launch]").onclick();
      expect(completions).toBe(0);
      expect(node("[data-launch]").disabled).toBe(true);
      node("[data-launch]").onclick();
      expect(root.dataset.shots).toBe(1);
      await vi.advanceTimersByTimeAsync(350);
      expect(root.dataset.shots).toBe(2);
      node("[data-reset]").onclick();
      expect(completions).toBe(0);
      await vi.runAllTimersAsync();
      while (Number(root.dataset.shots) < 6) {
        node("[data-launch]").onclick();
        await vi.runAllTimersAsync();
      }
      expect(completions).toBe(1);
      node("[data-launch]").onclick();
      node("[data-cancel]").onclick();
      expect(completions).toBe(1);
      node("[data-reset]").onclick();
      await vi.runAllTimersAsync();
      while (Number(root.dataset.shots) < 6) {
        node("[data-launch]").onclick();
        await vi.runAllTimersAsync();
      }
      expect(completions).toBe(2);
    } finally {
      dispose();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
  it("uscire durante il turno del computer non completa la partita", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const { root, node } = mount();
    let completions = 0;
    const dispose = createCurlingGame(root, {
      onComplete: () => {
        completions++;
      },
    });
    node("[data-launch]").onclick();
    dispose();
    await vi.runAllTimersAsync();
    expect(root.dataset.shots).toBe(1);
    expect(completions).toBe(0);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
