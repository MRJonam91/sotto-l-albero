import { useEffect, useState } from "react";
import { api } from "./api.js";

const emptyCollection = { ids: [], loaded: false, saving: false, error: "" };

export function useStampCollection(userId) {
  const [accounts, setAccounts] = useState({});
  const collection = accounts[userId] ?? emptyCollection;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    api("/stamps").then(
      ({ stamps }) => {
        if (!active) return;
        setAccounts((previous) => {
          const current = previous[userId] ?? emptyCollection;
          return {
            ...previous,
            [userId]: {
              ...current,
              ids: [...new Set([...current.ids, ...stamps])],
              loaded: true,
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
    return () => {
      active = false;
    };
  }, [userId]);

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
