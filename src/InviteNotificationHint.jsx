import { useEffect, useState } from "react";
import { api } from "./api.js";

export default function InviteNotificationHint({ onConfigure, onDismiss }) {
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    api("/profile")
      .then((result) => {
        if (active) setProfile(result);
      })
      .catch(() => {
        // The invitation stays accepted even when preferences cannot be read.
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const email = profile
    ? profile.notifyEmail
      ? "Gli avvisi via email sono attivati nelle tue preferenze."
      : "Gli avvisi via email sono disattivati nelle tue preferenze. Puoi attivarli dal profilo."
    : loaded
      ? "Puoi controllare nel profilo come ricevere gli avvisi del gruppo."
      : "Controlliamo le tue preferenze per gli avvisi del gruppo…";
  const telegram = !profile
    ? "Telegram è facoltativo: per ricevere gli avvisi devi collegarlo e attivarlo nel profilo."
    : !profile.telegramAvailable
      ? "Telegram non è disponibile al momento. Puoi comunque gestire le preferenze email."
      : profile.telegramLinked && profile.notifyTelegram
        ? "Hai già collegato Telegram e attivato i suoi avvisi. Puoi gestirli nel profilo."
        : profile.telegramLinked
          ? "Telegram è collegato, ma i suoi avvisi sono disattivati. Se li vuoi, attivali nel profilo."
          : "Telegram è facoltativo: collega il tuo account e attiva gli avvisi nel profilo per riceverli anche lì.";

  return (
    <aside
      className="invite-notification-hint paper"
      role="status"
      aria-label="Avvisi del gruppo"
    >
      <h2>Come vuoi ricevere gli avvisi?</h2>
      <p>{email}</p>
      <p>{telegram}</p>
      <div className="button-row">
        <button type="button" className="button" onClick={onConfigure}>
          Configura gli avvisi
        </button>
        <button type="button" className="button outline" onClick={onDismiss}>
          Più tardi
        </button>
      </div>
    </aside>
  );
}
