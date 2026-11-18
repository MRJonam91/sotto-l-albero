import { all } from "./auth.js";
import { gameCatalog } from "../shared/gameCatalog.js";

const scoreMaximum = `CASE game ${gameCatalog
  .filter((game) => game.points > 0)
  .map((game) => `WHEN '${game.id}' THEN ${game.points}`)
  .join(" ")} WHEN 'duel' THEN 100 ELSE NULL END`;

// Batch by users rather than issuing a query for every member of a group.
// Only aggregates leave this helper: no answer, message or opponent data.
export async function loadHolidayActivities(db, userIds) {
  const ids = [
    ...new Set(userIds.filter((id) => typeof id === "string" && id)),
  ];
  const result = new Map(
    ids.map((id) => [id, { games: [], stampsCount: 0, interactionsCount: 0 }]),
  );
  for (let offset = 0; offset < ids.length; offset += 20) {
    const chunk = ids.slice(offset, offset + 20);
    const placeholders = chunk.map(() => "?").join(",");
    const [games, stamps, interactions] = await Promise.all([
      all(
        db,
        `WITH completed AS (
        SELECT user_id,game,MAX(0.0,MIN(1.0,raw_score*1.0/(${scoreMaximum}))) AS result
        FROM competition_attempts WHERE user_id IN (${placeholders}) AND raw_score IS NOT NULL
        UNION ALL
        SELECT user_id,game,CASE
          WHEN game='memory' THEN 1.0
          WHEN game='quiz' AND json_type(safe_state,'$.score') IN ('integer','real') THEN MAX(0.0,MIN(1.0,json_extract(safe_state,'$.score')/5.0))
          WHEN game='film' AND json_type(safe_state,'$.score') IN ('integer','real') THEN MAX(0.0,MIN(1.0,json_extract(safe_state,'$.score')*1.0/COALESCE(NULLIF(json_array_length(safe_state,'$.questions'),0),10)))
          WHEN game NOT IN ('quiz','film','memory') AND json_type(safe_state,'$.practiceScore') IN ('integer','real') THEN MAX(0.0,MIN(1.0,json_extract(safe_state,'$.practiceScore')/100.0))
          ELSE NULL END AS result
        FROM (SELECT user_id,game,CASE WHEN json_valid(state) THEN state ELSE '{}' END AS safe_state
          FROM practice_games WHERE user_id IN (${placeholders}) AND done=1)
        UNION ALL
        SELECT player_x AS user_id,'tris' AS game,CASE WHEN status='draw' THEN 0.5 WHEN winner='X' THEN 1.0 ELSE 0.0 END AS result
        FROM tris_duels WHERE player_x IN (${placeholders}) AND status IN ('won','draw')
        UNION ALL
        SELECT player_o AS user_id,'tris' AS game,CASE WHEN status='draw' THEN 0.5 WHEN winner='O' THEN 1.0 ELSE 0.0 END AS result
        FROM tris_duels WHERE player_o IN (${placeholders}) AND status IN ('won','draw')
      ) SELECT user_id,game,COUNT(*) AS count,AVG(result) AS averageResult FROM completed GROUP BY user_id,game ORDER BY user_id,game`,
        ...chunk,
        ...chunk,
        ...chunk,
        ...chunk,
      ),
      all(
        db,
        `SELECT user_id,COUNT(DISTINCT stamp) AS count FROM user_stamps WHERE user_id IN (${placeholders}) GROUP BY user_id`,
        ...chunk,
      ),
      all(
        db,
        `SELECT sender_id AS user_id,COUNT(*) AS count FROM portrait_interactions WHERE sender_id IN (${placeholders}) GROUP BY sender_id`,
        ...chunk,
      ),
    ]);
    for (const { user_id, game, count, averageResult } of games)
      result.get(user_id).games.push({ game, count, averageResult });
    for (const row of stamps) result.get(row.user_id).stampsCount = row.count;
    for (const row of interactions)
      result.get(row.user_id).interactionsCount = row.count;
  }
  return result;
}
