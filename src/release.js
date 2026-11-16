export function releaseUrl(href, buildId) {
  const url = new URL(href);
  url.searchParams.set("__release", buildId);
  return url.href;
}

// One monitor per mounted app. Background tabs check immediately on resume.
export function watchRelease({ buildId, canReload, onUpdate, reload }) {
  let stopped = false,
    pending = false,
    reloading = false,
    announced = "";
  let controller;
  async function check() {
    if (
      stopped ||
      pending ||
      reloading ||
      document.visibilityState === "hidden"
    )
      return;
    pending = true;
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch("/version.json", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return;
      const release = await response.json();
      if (
        stopped ||
        typeof release.buildId !== "string" ||
        !/^[a-z0-9._-]{1,128}$/i.test(release.buildId) ||
        release.buildId === buildId
      )
        return;
      if (canReload()) {
        if (reload(release.buildId) !== false) {
          reloading = true;
          return;
        }
      }
      if (announced !== release.buildId) {
        announced = release.buildId;
        onUpdate(release);
      }
    } catch {
      // An offline or interrupted check must never interrupt the current task.
    } finally {
      clearTimeout(timeout);
      pending = false;
    }
  }
  const events = ["focus", "online", "pageshow"];
  for (const event of events) window.addEventListener(event, check);
  document.addEventListener("visibilitychange", check);
  const interval = setInterval(check, 60_000);
  check();
  return () => {
    stopped = true;
    controller?.abort();
    clearInterval(interval);
    for (const event of events) window.removeEventListener(event, check);
    document.removeEventListener("visibilitychange", check);
  };
}
