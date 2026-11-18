// A playful measure of recorded participation, independent of personal traits.
export const festiveLevels = [
  { id: "observer", label: "Natale da scoprire", minimum: 0 },
  { id: "curious", label: "La curiosità si accende", minimum: 20 },
  { id: "involved", label: "Nel vivo delle feste", minimum: 45 },
  { id: "spirit", label: "Spirito di Natale", minimum: 75 },
];
const knownGames = new Set([
  "quiz",
  "duel",
  "memory",
  "film",
  "pacchi",
  "slitta",
  "cartolina",
  "addobbi",
  "tris",
  "curling",
]);
const cap = (value, maximum) =>
  Math.max(0, Math.min(maximum, Math.floor(Number(value) || 0)));

export function computeFestiveProgress(activity = {}, profile = {}) {
  const games = new Map();
  for (const entry of Array.isArray(activity.games) ? activity.games : []) {
    if (!knownGames.has(entry.game)) continue;
    // Quiz duels count as quiz variety, never a second game family.
    const game = entry.game === "duel" ? "quiz" : entry.game;
    games.set(game, cap((games.get(game) || 0) + cap(entry.count, 3), 3));
  }
  const gamePoints = [...games.values()].reduce(
    (sum, count) => sum + (count ? 8 + count - 1 : 0),
    0,
  );
  const toolPoints =
    cap(activity.tools?.wishlistItemsCount, 5) +
    cap(activity.tools?.organizedEventsCount, 2);
  // Membership is permission to join; it is not meaningful participation.
  // Optional choices add at most three points, regardless of the selected mood.
  const optionalPoints =
    (profile.dailyMood ? 1 : 0) +
    Math.min(2, Math.floor(Object.keys(profile.answers || {}).length / 3));
  const observedScore = Math.min(
    100,
    gamePoints +
      cap(activity.stampsCount, 12) +
      cap(activity.interactionsCount, 5) +
      toolPoints +
      optionalPoints,
  );
  const score = Math.max(
    observedScore,
    cap(activity.festiveProgressScore, 100),
  );
  const index = festiveLevels.findLastIndex((level) => score >= level.minimum);
  return {
    score,
    level: festiveLevels[index],
    nextLevel: festiveLevels[index + 1] || null,
  };
}
