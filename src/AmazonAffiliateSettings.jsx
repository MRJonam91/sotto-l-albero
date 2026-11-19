import { t } from "./i18n.js";
import { useEffect, useState } from "react";
import { api } from "./api.js";
import { Button, Field, Notice } from "./ui.jsx";
import "./amazon-wishlist.css";

export default function AmazonAffiliateSettings() {
  const [preferences, setPreferences] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    api("/preferences/amazon")
      .then((result) => {
        if (active) setPreferences(result);
      })
      .catch(() => {
        // A failed capability check must not reveal account-restricted controls.
      });
    return () => {
      active = false;
    };
  }, []);
  if (!preferences?.allowed) return null;
  const siteWide = preferences.scope === "site";
  return (
    <details className="profile-panel amazon-advanced">
      <summary>{t("Opzioni avanzate · link Amazon")}</summary>
      <p>
        {t(
          siteWide
            ? "Quando l’opzione è attiva, il sito applica il tracking ID ai link Amazon nelle lettere di tutti i partecipanti."
            : "Puoi usare il tuo tracking ID nei prodotti Amazon che scegli nella tua lettera. L’opzione riguarda solo i tuoi desideri selezionati.",
        )}
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const result = await api("/preferences/amazon", "PUT", {
              tag: preferences.tag,
              enabled: preferences.enabled,
            });
            setPreferences(result);
            setNotice(
              siteWide
                ? "Preferenza Amazon salvata."
                : "Preferenza salvata. Scegli i prodotti nella tua lettera e salva la lettera per applicarla.",
            );
          } catch (failure) {
            setError(failure.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field
          label={t("Il tuo tracking ID Amazon")}
          hint={t(
            "Inserisci il codice che trovi nel tuo account del Programma Affiliazione Amazon. Nessun codice è preimpostato.",
          )}
          value={preferences.tag}
          maxLength={64}
          autoComplete="off"
          disabled={busy}
          onChange={(event) =>
            setPreferences({ ...preferences, tag: event.target.value })
          }
        />
        <label className="profile-toggle">
          <input
            type="checkbox"
            checked={preferences.enabled}
            disabled={busy}
            onChange={(event) =>
              setPreferences({ ...preferences, enabled: event.target.checked })
            }
          />
          <span>
            {t(
              siteWide
                ? "Applica il tracking ID ai link Amazon di tutte le lettere"
                : "Consenti di applicare il mio codice ai link Amazon che seleziono nella mia lettera",
            )}
          </span>
        </label>
        <p className="profile-footnote">
          {t(
            siteWide
              ? "Il codice italiano si applica ad Amazon.it. Gli altri negozi Amazon usano i codici configurati su Cloudflare per ciascun mercato."
              : "Ogni prodotto richiede una scelta esplicita. Gli altri negozi e le lettere degli altri partecipanti mantengono i loro link. Disattivare l’opzione non modifica i link già salvati.",
          )}
        </p>
        <Notice error>{error}</Notice>
        <Notice>{t(notice)}</Notice>
        <div className="form-actions">
          <Button busy={busy}>{t("Salva opzione Amazon")}</Button>
        </div>
      </form>
    </details>
  );
}
