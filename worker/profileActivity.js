import { run } from "./auth.js";
import { HttpError, json } from "./security.js";
import { practiceAllowed } from "./practice.js";
import { romeToday } from "../shared/holidayPortrait.js";

// This endpoint records participation reported by the browser, never a verified
// score. Ranked games keep their existing server-owned completion routes.
export async function profileActivityRoute(request, env, body, user) {
  if (!user) throw new HttpError("Accedi per continuare.", 401);
  if (request.method !== "POST")
    throw new HttpError("Metodo non disponibile.", 405);
  if (
    body?.game !== "curling" ||
    Object.keys(body).some((key) => key !== "game")
  )
    throw new HttpError("Puoi registrare solo la partecipazione al curling.");
  if (!(await practiceAllowed(env.DB, user.id)))
    throw new HttpError(
      "Per giocare serve un’iscrizione approvata a un evento.",
      403,
    );
  const result = await run(
    env.DB,
    `INSERT OR IGNORE INTO profile_activity(user_id,game,day)
      SELECT ?,'curling',? WHERE
      (SELECT COUNT(*) FROM profile_activity WHERE user_id=? AND game='curling')<3
      AND EXISTS(SELECT 1 FROM members WHERE user_id=? AND status='approved')`,
    user.id,
    romeToday(),
    user.id,
    user.id,
  );
  return json({ ok: true, recorded: result.meta.changes === 1 });
}
