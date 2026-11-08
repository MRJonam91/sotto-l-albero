import { all, first, run } from "./auth.js";
import { HttpError, json } from "./security.js";
import { practiceAllowed } from "./practice.js";
import { isStampAvailable, stamps } from "../shared/stamps.js";

export async function stampRoute(method, db, userId, body) {
  if (method === "GET") {
    const rows = await all(
      db,
      "SELECT stamp FROM user_stamps WHERE user_id=? ORDER BY stamp",
      userId,
    );
    return json({ stamps: rows.map(({ stamp }) => stamp) });
  }
  if (method !== "POST") throw new HttpError("Metodo non disponibile.", 405);
  const stamp = body?.stamp;
  if (typeof stamp !== "string" || !Object.hasOwn(stamps, stamp)) {
    throw new HttpError("Questo timbro non esiste.");
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
  if (!isStampAvailable(stamps[stamp], Date.now())) {
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
    "INSERT INTO user_stamps(user_id,stamp) VALUES(?,?) ON CONFLICT(user_id,stamp) DO NOTHING",
    userId,
    stamp,
  );
  return json({ stamp });
}
