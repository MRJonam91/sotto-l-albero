import { HttpError } from "./security.js";

const randomAttempts = 64;

function shuffle(items) {
  const a = [...items];
  if (a.length < 2) return a;
  const values = crypto.getRandomValues(new Uint32Array(a.length - 1));
  for (let i = a.length - 1; i > 0; i--) {
    const limit = 4294967296 - (4294967296 % (i + 1));
    let x = values[i - 1];
    while (x >= limit) {
      x = crypto.getRandomValues(new Uint32Array(1))[0];
    }
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
  const fixedPairs = [...fixed].map(([giverId, receiverId]) => ({
    giverId,
    receiverId,
  }));
  const givers = ids.filter((giver) => !fixed.has(giver));
  const receivers = ids.filter((receiver) => !taken.has(receiver));
  const allowed = (giver, receiver) =>
    giver !== receiver && !excluded.has(`${giver}:${receiver}`);

  // Unbiased permutations give each allowed outcome the same chance at this stage.
  for (let attempt = 0; attempt < randomAttempts; attempt++) {
    const order = shuffle(receivers);
    if (givers.every((giver, index) => allowed(giver, order[index]))) {
      return fixedPairs.concat(
        givers.map((giverId, index) => ({ giverId, receiverId: order[index] })),
      );
    }
  }

  // A complete matching search handles tight constraints without an unbounded retry loop.
  const owners = new Map();
  const candidates = new Map(
    givers.map((giver) => [
      giver,
      shuffle(receivers.filter((receiver) => allowed(giver, receiver))),
    ]),
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
  for (const giver of shuffle(givers))
    if (!visit(giver, new Set()))
      throw new HttpError(
        "Con queste regole non riusciamo ad abbinare tutti. Controlla le esclusioni e le coppie fissate.",
      );
  return fixedPairs.concat(
    [...owners].map(([receiverId, giverId]) => ({ giverId, receiverId })),
  );
}
