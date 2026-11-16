import { all, first, run } from "./auth.js";
import { HttpError, id, json, safeText } from "./security.js";
import { evaluateBoard, playMove } from "../shared/snowTicTacToe.js";

const selected = `SELECT d.*,x.name AS x_name,o.name AS o_name FROM tris_duels d
  JOIN users x ON x.id=d.player_x JOIN users o ON o.id=d.player_o`;
const approvedPlayers = (alias) =>
  ["player_x", "player_o"]
    .map(
      (field) =>
        `EXISTS(SELECT 1 FROM members WHERE event_id=${alias}.event_id AND user_id=${alias}.${field} AND status='approved')`,
    )
    .join(" AND ");

function view(row, userId, now, closed) {
  const board = JSON.parse(row.board);
  const result = evaluateBoard(board);
  const expired = row.status === "active" && (row.expires <= now || closed);
  const myMark = row.player_x === userId ? "X" : "O";
  return {
    id: row.id,
    board,
    revision: row.revision,
    status: expired ? "expired" : row.status,
    turn: expired ? null : row.turn,
    myMark,
    myTurn: !expired && row.status === "active" && row.turn === myMark,
    winner: row.winner,
    line: result.line,
    expires: row.expires,
    opponent:
      row.player_x === userId
        ? { userId: row.player_o, name: row.o_name }
        : { userId: row.player_x, name: row.x_name },
  };
}

async function requirePlayers(db, eventId, firstId, secondId) {
  const approved = await first(
    db,
    "SELECT COUNT(*) AS count FROM members WHERE event_id=? AND user_id IN (?,?) AND status='approved'",
    eventId,
    firstId,
    secondId,
  );
  if (approved.count !== 2)
    throw new HttpError(
      "Il tris è riservato a due partecipanti approvati dello stesso evento.",
      403,
    );
}

export async function trisDuelsRoute(
  request,
  db,
  context,
  duelId,
  body,
  userId,
  now,
  seasonEnd,
) {
  const { event } = context;
  if (!event.approved)
    throw new HttpError("Serve un’iscrizione approvata all’evento.", 403);
  const closed = event.status === "archived" || now >= seasonEnd;
  if (request.method === "GET" && !duelId) {
    const rows = await all(
      db,
      `${selected}
      WHERE d.event_id=? AND (d.player_x=? OR d.player_o=?)
      AND EXISTS(SELECT 1 FROM members WHERE event_id=d.event_id AND user_id=d.player_x AND status='approved')
      AND EXISTS(SELECT 1 FROM members WHERE event_id=d.event_id AND user_id=d.player_o AND status='approved')
      ORDER BY CASE WHEN d.status='active' AND d.expires>? THEN 0 ELSE 1 END,d.expires DESC,d.id LIMIT 30`,
      event.id,
      userId,
      userId,
      now,
    );
    return json({ duels: rows.map((row) => view(row, userId, now, closed)) });
  }
  if (request.method !== "POST")
    throw new HttpError("Metodo non disponibile.", 405);
  if (closed) throw new HttpError("Questa edizione è conclusa.", 409);
  if (!duelId) {
    const opponentId = safeText(body?.userId, 64, true);
    if (opponentId === userId)
      throw new HttpError("Scegli un’altra persona del gruppo.");
    await requirePlayers(db, event.id, userId, opponentId);
    const duelId = id();
    const result = await run(
      db,
      `
      INSERT INTO tris_duels(id,event_id,player_x,player_o,board,turn,expires)
      SELECT ?,e.id,?,?,?,'X',? FROM events e WHERE e.id=? AND e.status<>'archived'
      AND EXISTS(SELECT 1 FROM members WHERE event_id=e.id AND user_id=? AND status='approved')
      AND EXISTS(SELECT 1 FROM members WHERE event_id=e.id AND user_id=? AND status='approved')
      AND NOT EXISTS(SELECT 1 FROM tris_duels d WHERE d.event_id=e.id AND d.status='active' AND d.expires>?
        AND ((d.player_x=? AND d.player_o=?) OR (d.player_x=? AND d.player_o=?)))
      AND (SELECT COUNT(*) FROM tris_duels d WHERE d.event_id=e.id AND d.status='active' AND d.expires>? AND (d.player_x=? OR d.player_o=?) AND ${approvedPlayers("d")})<5
      AND (SELECT COUNT(*) FROM tris_duels d WHERE d.event_id=e.id AND d.status='active' AND d.expires>? AND (d.player_x=? OR d.player_o=?) AND ${approvedPlayers("d")})<5`,
      duelId,
      userId,
      opponentId,
      JSON.stringify(Array(9).fill(null)),
      Math.min(now + 2 * 86_400_000, seasonEnd),
      event.id,
      userId,
      opponentId,
      now,
      userId,
      opponentId,
      opponentId,
      userId,
      now,
      userId,
      userId,
      now,
      opponentId,
      opponentId,
    );
    if (!result.meta.changes)
      throw new HttpError(
        "Avete già un tris aperto o cinque partite in corso. Aggiorna l’elenco.",
        409,
      );
    const row = await first(db, `${selected} WHERE d.id=?`, duelId);
    return json({ duel: view(row, userId, now, false) }, 201);
  }
  const row = await first(
    db,
    `${selected} WHERE d.id=? AND d.event_id=?`,
    duelId,
    event.id,
  );
  if (!row || (row.player_x !== userId && row.player_o !== userId))
    throw new HttpError("Questa partita non è tua.", 403);
  await requirePlayers(db, event.id, row.player_x, row.player_o);
  if (row.expires <= now)
    throw new HttpError("Il tempo per questa partita è scaduto.", 410);
  if (row.status !== "active" || body?.revision !== row.revision)
    throw new HttpError(
      "La partita è cambiata. Aggiornala prima di giocare.",
      409,
    );
  const mark = row.player_x === userId ? "X" : "O";
  if (row.turn !== mark) throw new HttpError("Aspetta il tuo turno.", 409);
  let board;
  try {
    board = playMove(JSON.parse(row.board), body?.position, mark);
  } catch (error) {
    throw new HttpError(error.message);
  }
  const result = evaluateBoard(board);
  const status = result.winner ? "won" : result.draw ? "draw" : "active";
  const changed = await run(
    db,
    `UPDATE tris_duels SET board=?,turn=?,status=?,winner=?,revision=revision+1
    WHERE id=? AND event_id=? AND revision=? AND turn=? AND status='active' AND expires>?
      AND EXISTS(SELECT 1 FROM events WHERE id=tris_duels.event_id AND status<>'archived')
      AND ${approvedPlayers("tris_duels")}`,
    JSON.stringify(board),
    result.turn,
    status,
    result.winner,
    row.id,
    event.id,
    row.revision,
    mark,
    now,
  );
  if (!changed.meta.changes)
    throw new HttpError(
      "La partita è cambiata. Aggiornala prima di giocare.",
      409,
    );
  return json({
    duel: view(
      await first(db, `${selected} WHERE d.id=?`, row.id),
      userId,
      now,
      false,
    ),
  });
}
