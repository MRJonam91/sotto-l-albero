import { useId } from "react";
import { holidayMoods } from "../shared/holidayPortrait.js";
import { Button } from "./ui.jsx";

export default function DailyMoodPicker({
  value,
  onChange,
  onSave,
  busy = false,
}) {
  const group = useId();
  return (
    <div className="daily-mood-picker">
      <p>
        Una sola scelta per raccontare la giornata. Puoi cambiarla dal profilo.
      </p>
      <fieldset className="daily-mood-options" disabled={busy}>
        <legend>Oggi mi sento come…</legend>
        {holidayMoods.map((mood) => (
          <label
            className="daily-mood-option"
            key={mood.id}
            data-selected={value === mood.id || undefined}
          >
            <input
              type="radio"
              name={group}
              value={mood.id}
              checked={value === mood.id}
              onChange={() => onChange(mood.id)}
            />
            <span>
              <strong>
                <span aria-hidden="true">{mood.emoji} </span>
                {mood.label}
              </strong>
              <small>{mood.description}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="form-actions">
        <Button
          type="button"
          busy={busy}
          disabled={!value || busy}
          onClick={onSave}
        >
          Salva stato
        </Button>
      </div>
    </div>
  );
}
