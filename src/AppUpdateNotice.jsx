import { t } from "./i18n.js";
import { useEffect, useRef, useState } from "react";
import { releaseUrl, watchRelease } from "./release.js";
import "./app-update.css";

export default function AppUpdateNotice({ idlePage }) {
  const [available, setAvailable] = useState(null);
  const idle = useRef(idlePage);
  idle.current = idlePage;

  function reload(buildId, automatic = false) {
    try {
      // A stale intermediary must not trap the user in a reload loop.
      if (
        automatic &&
        sessionStorage.getItem("sla-release-attempt") === buildId
      ) {
        return false;
      }
      sessionStorage.setItem("sla-release-attempt", buildId);
    } catch {
      /* Private browsing may disable storage. */
    }
    location.replace(releaseUrl(location.href, buildId));
    return true;
  }

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const url = new URL(location.href);
    if (url.searchParams.get("__release") === __APP_BUILD_ID__) {
      url.searchParams.delete("__release");
      history.replaceState(history.state, "", url);
      try {
        sessionStorage.removeItem("sla-release-attempt");
      } catch {
        /* Optional storage. */
      }
    }
    return watchRelease({
      buildId: __APP_BUILD_ID__,
      canReload: () =>
        idle.current &&
        !document.querySelector('form, dialog[open], [aria-busy="true"]'),
      onUpdate: setAvailable,
      reload: (id) => reload(id, true),
    });
  }, []);

  return available ? (
    <aside
      className="app-update"
      role="status"
      aria-label={t("Aggiornamento disponibile")}
    >
      <p>
        {t(
          "È pronta una nuova versione. Salva ciò che stai modificando, poi aggiorna.",
        )}
      </p>
      <button
        type="button"
        className="button outline"
        onClick={() => reload(available.buildId)}
      >
        {t("Aggiorna ora")}
      </button>
    </aside>
  ) : null;
}
