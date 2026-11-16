import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchRelease, releaseUrl } from "../src/release.js";
import worker from "../worker/index.js";

describe("release freshness", () => {
  let win, doc, fetchVersion, reload, onUpdate, canReload, stop;
  beforeEach(() => {
    vi.useFakeTimers();
    win = new EventTarget();
    doc = new EventTarget();
    doc.visibilityState = "visible";
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    fetchVersion = vi.fn(
      async () =>
        new Response(JSON.stringify({ buildId: "build-b", version: "1.3.1" })),
    );
    vi.stubGlobal("fetch", fetchVersion);
    reload = vi.fn();
    onUpdate = vi.fn();
    canReload = vi.fn(() => true);
  });
  afterEach(() => {
    stop?.();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const settle = async () => {
    await vi.advanceTimersByTimeAsync(0);
  };
  function start() {
    stop = watchRelease({ buildId: "build-a", canReload, onUpdate, reload });
  }
  it("reloads an idle page once when a new build is deployed, bypassing the browser cache", async () => {
    start();
    await settle();
    expect(fetchVersion.mock.calls[0][0]).toBe("/version.json");
    expect(fetchVersion.mock.calls[0][1].cache).toBe("no-store");
    expect(reload).toHaveBeenCalledExactlyOnceWith("build-b");
    win.dispatchEvent(new Event("focus"));
    await settle();
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("keeps an edited page open and announces the available release", async () => {
    canReload.mockReturnValue(false);
    start();
    await settle();
    expect(reload).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith({
      buildId: "build-b",
      version: "1.3.1",
    });
    canReload.mockReturnValue(true);
    win.dispatchEvent(new Event("focus"));
    await settle();
    expect(reload).toHaveBeenCalledExactlyOnceWith("build-b");
  });
  it("does not reload the current build", async () => {
    fetchVersion.mockResolvedValue(
      new Response(JSON.stringify({ buildId: "build-a", version: "1.3.1" })),
    );
    start();
    await settle();
    expect(reload).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
  });
  it("keeps checking later releases when a repeated automatic reload is suppressed", async () => {
    reload.mockReturnValue(false);
    start();
    await settle();
    fetchVersion.mockImplementation(
      async () => new Response(JSON.stringify({ buildId: "build-c" })),
    );
    win.dispatchEvent(new Event("focus"));
    await settle();
    expect(reload).toHaveBeenLastCalledWith("build-c");
    expect(onUpdate).toHaveBeenLastCalledWith({ buildId: "build-c" });
  });
  it("checks again when a mobile tab resumes from the background or page cache", async () => {
    fetchVersion.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            buildId:
              fetchVersion.mock.calls.length === 1 ? "build-a" : "build-b",
          }),
        ),
    );
    start();
    await settle();
    doc.visibilityState = "hidden";
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchVersion).toHaveBeenCalledTimes(1);
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    await settle();
    expect(reload).toHaveBeenCalledExactlyOnceWith("build-b");
  });
  it("checks a page restored from the back-forward cache", async () => {
    canReload.mockReturnValue(false);
    start();
    await settle();
    const shown = new Event("pageshow");
    shown.persisted = true;
    win.dispatchEvent(shown);
    await settle();
    expect(fetchVersion).toHaveBeenCalledTimes(2);
  });
  it("checks at most one request at a time", async () => {
    fetchVersion.mockImplementation(() => new Promise(() => {}));
    start();
    win.dispatchEvent(new Event("focus"));
    win.dispatchEvent(new Event("online"));
    await settle();
    expect(fetchVersion).toHaveBeenCalledTimes(1);
  });
  it.each(["offline", "invalid", "unavailable"])(
    "does not interrupt the user when the version check is %s",
    async (failure) => {
      fetchVersion.mockImplementation(async () => {
        if (failure === "offline") throw new TypeError("offline");
        return failure === "invalid"
          ? new Response("<html>fallback</html>")
          : new Response("{}", { status: 503 });
      });
      start();
      await settle();
      expect(reload).not.toHaveBeenCalled();
      expect(onUpdate).not.toHaveBeenCalled();
    },
  );
  it("does not navigate after unmount, even if a response arrives late", async () => {
    let finish;
    fetchVersion.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    start();
    stop();
    finish(new Response(JSON.stringify({ buildId: "build-b" })));
    await settle();
    win.dispatchEvent(new Event("focus"));
    await settle();
    expect(reload).not.toHaveBeenCalled();
    expect(fetchVersion).toHaveBeenCalledTimes(1);
  });
  it("keeps invite paths, query parameters and anchors when bypassing stale HTML", () => {
    expect(
      releaseUrl(
        "https://example.test/invite/abc?tab=admin#lettera",
        "build-b",
      ),
    ).toBe(
      "https://example.test/invite/abc?tab=admin&__release=build-b#lettera",
    );
  });
});

describe("HTML delivery", () => {
  it.each(["/", "/desideri", "/archivio", "/events/123", "/invite/abc"])(
    "does not cache the application shell at %s",
    async (path) => {
      const response = await worker.fetch(
        new Request(`https://example.test${path}`),
        {
          ASSETS: {
            fetch: async () =>
              new Response("<main>Secret Santa</main>", {
                headers: {
                  "Content-Type": "text/html",
                  "Cache-Control": "public, max-age=3600",
                },
              }),
          },
        },
      );
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBe(
        "no-store",
      );
      expect(await response.text()).toContain("Secret Santa");
    },
  );
});
