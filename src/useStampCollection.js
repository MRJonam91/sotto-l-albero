import { useEffect, useState } from "react";
import { api } from "./api.js";

const emptyCollection = {
  ids: [],
  loaded: false,
  saving: false,
  error: "",
  release: null,
};

export function useStampCollection(userId, eventsRevision) {
  const [accounts, setAccounts] = useState({});
  const collection = accounts[userId] ?? emptyCollection;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    function refresh() {
      if (document.visibilityState === "hidden") return;
      api("/stamps").then(
        ({ stamps, release }) => {
          if (!active) return;
          setAccounts((previous) => {
            const current = previous[userId] ?? emptyCollection;
            return {
              ...previous,
              [userId]: {
                ...current,
                ids: [...new Set([...current.ids, ...stamps])],
                loaded: true,
                release: release ?? null,
                error: "",
              },
            };
          });
        },
        (error) => {
          if (!active) return;
          setAccounts((previous) => ({
            ...previous,
            [userId]: {
              ...(previous[userId] ?? emptyCollection),
              error: error.message,
            },
          }));
        },
      );
    }
    refresh();
    const timer = setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [userId, eventsRevision]);

  async function collect(stamp) {
    if (!userId || collection.ids.includes(stamp) || collection.saving) return;
    function update(change) {
      setAccounts((previous) => ({
        ...previous,
        [userId]: change(previous[userId] ?? emptyCollection),
      }));
    }
    update((current) => ({ ...current, saving: true, error: "" }));
    try {
      await api("/stamps", "POST", { stamp });
      update((current) => ({
        ...current,
        ids: [...new Set([...current.ids, stamp])],
        saving: false,
      }));
    } catch (error) {
      update((current) => ({
        ...current,
        saving: false,
        error: error.message,
      }));
    }
  }

  return { ...collection, collect };
}
