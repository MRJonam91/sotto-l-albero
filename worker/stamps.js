import { all, first, run } from "./auth.js";
import { HttpError, json } from "./security.js";
import { practiceAllowed } from "./practice.js";
import { isStampAvailable, stamps } from "../shared/stamps.js";
import { buildStampRelease, releaseStampIds } from "../shared/stampRollout.js";

async function stampRelease(db, userId, env, now) {
  const events = await all(
    db,
    "SELECT e.id,e.name,e.gift_at,e.created_at FROM events e JOIN members m ON m.event_id=e.id WHERE m.user_id=? AND m.status='approved' AND e.status!='archived'",
    userId,
  );
  return buildStampRelease({ startDate: env.STAMP_ROLLOUT_START, events, now });
}

export async function stampRoute(method, db, userId, body, env = {}) {
  if (method === "GET") {
    const rows = await all(
      db,
      "SELECT stamp FROM user_stamps WHERE user_id=? ORDER BY stamp",
      userId,
    );
    return json({
      stamps: rows.map(({ stamp }) => stamp),
      release: await stampRelease(db, userId, env, Date.now()),
    });
  }
  if (method !== "POST") throw new HttpError("Metodo non disponibile.", 405);
  const stamp = body?.stamp;
  if (typeof stamp !== "string" || !Object.hasOwn(stamps, stamp)) {
    throw new HttpError("Questo timbro non esiste.");
  }
  const now = Date.now();
  if (releaseStampIds.includes(stamp)) {
    // Reopening an already collected stamp must survive membership changes and
    // a disabled rollout. The server alone decides eligibility for new finds.
    if (
      await first(
        db,
        "SELECT 1 FROM user_stamps WHERE user_id=? AND stamp=?",
        userId,
        stamp,
      )
    )
      return json({ stamp });
    const release = await stampRelease(db, userId, env, now);
    if (!release.enabled || !release.giftDate)
      throw new HttpError(
        "Per raccogliere questo timbro serve un’iscrizione approvata a un evento con la raccolta attiva.",
        403,
      );
    if (!release.availableIds.includes(stamp))
      throw new HttpError(
        "Questo timbro non è ancora disponibile. Torna il giorno indicato nella raccolta.",
        409,
      );
  }
  if (
    ["quiz", "memory", "cookie"].includes(stamp) &&
    !(await practiceAllowed(db, userId))
  ) {
    throw new HttpError(
      "Per raccogliere questo timbro serve un’iscrizione approvata a un evento.",
      403,
    );
  }
  if (
    (stamp === "quiz" || stamp === "memory") &&
    !(await first(
      db,
      "SELECT 1 FROM practice_games WHERE user_id=? AND game=? AND done=1 UNION ALL SELECT 1 FROM user_stamps WHERE user_id=? AND stamp=? LIMIT 1",
      userId,
      stamp,
      userId,
      stamp,
    ))
  ) {
    throw new HttpError("Completa la partita per raccogliere il timbro.", 403);
  }
  if (!isStampAvailable(stamps[stamp], now)) {
    const collected = await first(
      db,
      "SELECT 1 FROM user_stamps WHERE user_id=? AND stamp=?",
      userId,
      stamp,
    );
    if (collected) return json({ stamp });
    throw new HttpError(
      "Questa apparizione è passata. Il ritornello ti aiuta a ritrovarla domani.",
      409,
    );
  }
  await run(
    db,
    "INSERT INTO user_stamps(user_id,stamp,collected_at) VALUES(?,?,?) ON CONFLICT(user_id,stamp) DO NOTHING",
    userId,
    stamp,
    now,
  );
  return json({ stamp });
}
