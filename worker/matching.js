import { HttpError } from "./security.js";
function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const limit = 4294967296 - (4294967296 % (i + 1));
    let x;
    do {
      x = crypto.getRandomValues(new Uint32Array(1))[0];
    } while (x >= limit);
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function matchParticipants(ids, rules = []) {
  if (ids.length < 3 || ids.length > 50 || new Set(ids).size !== ids.length)
    throw new HttpError("Servono da 3 a 50 partecipanti confermati.");
  const known = new Set(ids),
    fixed = new Map(),
    taken = new Set(),
    excluded = new Set();
  for (const r of rules) {
    if (!known.has(r.giverId) || !known.has(r.receiverId))
      throw new HttpError("Una regola riguarda una persona che non partecipa.");
    if (r.type === "exclude") excluded.add(`${r.giverId}:${r.receiverId}`);
  }
  for (const r of rules.filter((x) => x.type === "fixed")) {
    if (
      r.giverId === r.receiverId ||
      excluded.has(`${r.giverId}:${r.receiverId}`) ||
      fixed.has(r.giverId) ||
      taken.has(r.receiverId)
    )
      throw new HttpError("Le coppie fissate sono in conflitto con le regole.");
    fixed.set(r.giverId, r.receiverId);
    taken.add(r.receiverId);
  }
  const owners = new Map(),
    candidates = new Map();
  for (const giver of ids.filter((x) => !fixed.has(x)))
    candidates.set(
      giver,
      shuffle(
        ids.filter(
          (r) => !taken.has(r) && r !== giver && !excluded.has(`${giver}:${r}`),
        ),
      ),
    );
  function visit(giver, seen) {
    for (const receiver of candidates.get(giver)) {
      if (seen.has(receiver)) continue;
      seen.add(receiver);
      if (!owners.has(receiver) || visit(owners.get(receiver), seen)) {
        owners.set(receiver, giver);
        return true;
      }
    }
    return false;
  }
  for (const giver of shuffle([...candidates.keys()]))
    if (!visit(giver, new Set()))
      throw new HttpError(
        "Con queste regole non riusciamo ad abbinare tutti. Controlla le esclusioni e le coppie fissate.",
      );
  return [...fixed]
    .map(([giverId, receiverId]) => ({ giverId, receiverId }))
    .concat(
      [...owners].map(([receiverId, giverId]) => ({ giverId, receiverId })),
    );
}
