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
  return (
    <details className="profile-panel amazon-advanced">
      <summary>Opzioni avanzate · link Amazon</summary>
      <p>
        Puoi usare il tuo tracking ID nei prodotti Amazon che scegli nella tua
        lettera. L’opzione riguarda solo i tuoi desideri selezionati.
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
              "Preferenza salvata. Scegli i prodotti nella tua lettera e salva la lettera per applicarla.",
            );
          } catch (failure) {
            setError(failure.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field
          label="Il tuo tracking ID Amazon"
          hint="Inserisci il codice che trovi nel tuo account del Programma Affiliazione Amazon. Nessun codice è preimpostato."
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
            Consenti di applicare il mio codice ai link Amazon che seleziono
            nella mia lettera
          </span>
        </label>
        <p className="profile-footnote">
          Ogni prodotto richiede una scelta esplicita. Gli altri negozi e le
          lettere degli altri partecipanti mantengono i loro link. Disattivare
          l’opzione non modifica i link già salvati.
        </p>
        <p className="profile-footnote">
          Chi apre un link affiliato vede l’indicazione accanto al prodotto. In
          qualità di Affiliato Amazon ricevo un guadagno dagli acquisti idonei.
        </p>
        <Notice error>{error}</Notice>
        <Notice>{notice}</Notice>
        <div className="form-actions">
          <Button busy={busy}>Salva opzione Amazon</Button>
        </div>
      </form>
    </details>
  );
}
