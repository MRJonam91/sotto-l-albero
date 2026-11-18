import { all, first, run } from "./auth.js";
import { HttpError, id, json, safeText } from "./security.js";
import { createMemoryDeck, memoryCardCount } from "../shared/memory.js";
import { createMovieQuestions } from "../shared/christmasMovies.js";
import { quizQuestions } from "../shared/quizQuestions.js";
import {
  officialChallenge,
  scoreOfficialChallenge,
} from "../shared/officialChallenges.js";
import { stamps } from "../shared/stamps.js";
import { trisDuelsRoute } from "./trisDuels.js";
import { gameDefinitions } from "../shared/gameCatalog.js";
import {
  newInteractiveChallenge,
  publicInteractiveChallenge,
  turnInteractiveChallenge,
  interactiveEdition,
} from "./interactiveChallenges.js";

const DAY = 86_400_000;
const QUESTION_TIME = 20_000;
const isTimed = (game) => game === "quiz" || game === "duel" || game === "film";
const multipliers = [1, 0.95, 0.9];
const games = {
  ...gameDefinitions,
  cartolina: {
    ...gameDefinitions.cartolina,
    edition: interactiveEdition,
    type: "escape",
  },
  addobbi: {
    ...gameDefinitions.addobbi,
    edition: interactiveEdition,
    type: "catch",
  },
};

const collectibleStamps = Object.keys(stamps).filter(
  (stamp) => stamp !== "quiz" && stamp !== "memory",
);
const stampFilter = `stamp IN (${collectibleStamps.map(() => "?").join(",")})`;
const pointsPerStamp = 5;
const gameIds = Object.keys(games);
const gameBreakdown = gameIds
  .map(
    (game) =>
      `COALESCE(MAX(CASE WHEN best.game='${game}' THEN best.score END),0) AS ${game}`,
  )
  .join(", ");

const romeYear = new Intl.DateTimeFormat("it-IT", {
  year: "numeric",
  timeZone: "Europe/Rome",
});
const yearOf = (event) => Number(romeYear.format(new Date(event.gift_at)));
const yearStart = (year) => `${year - 1}-12-31T23:00:00.000Z`;
const yearEnd = (year) => Date.parse(yearStart(year + 1));
const stmt = (db, query, ...args) => db.prepare(query).bind(...args);
const stillOpen =
  "EXISTS (SELECT 1 FROM events WHERE id=competition_attempts.event_id AND status<>'archived')";

// At the Rome year boundary, local midnight is 23:00 UTC.
const seasonEndSql =
  "CAST(strftime('%s', printf('%04d-12-31 23:00:00', CAST(strftime('%Y',e.gift_at,'+1 hour') AS INTEGER))) AS INTEGER)*1000";
const stampCountSql = (user, cutoff) => `(
  SELECT COUNT(DISTINCT stamp)*${pointsPerStamp} FROM user_stamps
  WHERE user_id=${user} AND ${stampFilter} AND (collected_at IS NULL OR collected_at<${cutoff})
)`;
const stampPointsSql = (user) => `
  CASE WHEN e.archived_stamp_points IS NOT NULL THEN COALESCE(
    (SELECT value FROM json_each(e.archived_stamp_points) WHERE key=${user}),0
  ) ELSE ${stampCountSql(user, `MIN(${seasonEndSql},COALESCE(e.archived_at,${seasonEndSql}))`)} END
`;

export function archiveCompetition(db, eventId) {
  return run(
    db,
    `UPDATE events AS e SET status='archived', archived_at=?, archived_stamp_points=(
      SELECT json_group_object(m.user_id,${stampCountSql("m.user_id", seasonEndSql)})
      FROM members m WHERE m.event_id=e.id AND m.status='approved'
    ) WHERE id=? AND status<>'archived'`,
    Date.now(),
    ...collectibleStamps,
    eventId,
  );
}

function shuffled(values) {
  const copy = [...values];
  const random = crypto.getRandomValues(new Uint32Array(copy.length));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = random[i] % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function questionSet() {
  const selected = shuffled(quizQuestions).slice(0, 10);
  return selected.map(([text, options, answer]) => {
    const order = shuffled(options.map((_, index) => index));
    return {
      text,
      options: order.map((index) => options[index]),
      answer: order.indexOf(answer),
    };
  });
}

export async function getLeaderboard(db, event) {
  const rows = await all(
    db,
    `
    WITH best AS (
      SELECT user_id,game,MAX(score) AS score
      FROM competition_attempts
      WHERE event_id=? AND duel_id='' AND score IS NOT NULL
      GROUP BY user_id,game
    ), standings AS (
      SELECT u.id AS userId,u.name,COALESCE(c.adjustment,0) AS adjustment,
        COALESCE(SUM(best.score),0) AS gamePoints,
        ${stampPointsSql("u.id")} AS stampPoints,
        ${gameBreakdown}
      FROM members m
      JOIN events e ON e.id=m.event_id
      JOIN users u ON u.id=m.user_id
      LEFT JOIN competition_entries c ON c.event_id=m.event_id AND c.user_id=m.user_id
      LEFT JOIN best ON best.user_id=m.user_id
      WHERE m.event_id=? AND m.status='approved'
      GROUP BY u.id,u.name,c.adjustment
    )
    SELECT *,MAX(0,gamePoints+stampPoints+adjustment) AS score FROM standings
    ORDER BY score DESC,name COLLATE NOCASE,userId
  `,
    event.id,
    ...collectibleStamps,
    event.id,
  );
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || rows[index - 1].score !== row.score) rank = index + 1;
    const scores = Object.fromEntries(gameIds.map((game) => [game, row[game]]));
    return { ...row, scores, rank };
  });
}

async function access(db, eventId, userId) {
  const event = await first(
    db,
    `
    SELECT e.*,EXISTS(SELECT 1 FROM members m WHERE m.event_id=e.id AND m.user_id=? AND m.status='approved') AS approved
    FROM events e WHERE e.id=?
  `,
    userId,
    eventId,
  );
  if (!event) throw new HttpError("Questo evento non esiste.", 404);
  if (!event.approved && event.owner_id !== userId) {
    throw new HttpError(
      "Le sfide sono riservate a chi partecipa all’evento.",
      403,
    );
  }
  return { event, year: yearOf(event) };
}

function publicAttempt(attempt, now) {
  const state = JSON.parse(attempt.state);
  const done = attempt.raw_score !== null;
  const result = {
    id: attempt.id,
    game: attempt.game,
    duelId: attempt.duel_id || null,
    ordinal: attempt.ordinal,
    revision: attempt.revision,
    done,
    score: attempt.score,
    rawScore: attempt.duel_id ? null : attempt.raw_score,
  };
  if (attempt.game === "memory") {
    const visible = [...state.open, ...state.matched];
    return {
      ...result,
      mistakes: state.mistakes,
      needsCover: state.open.length === 2,
      cards: state.deck.map((symbol, position) => ({
        symbol: visible.includes(position) ? symbol : null,
        paired: state.matched.includes(position),
      })),
    };
  }
  if (state.interactive) {
    return {
      ...result,
      challenge: done ? null : publicInteractiveChallenge(state, now),
      ...(done && state.interactive === "catch" && state.edition
        ? { caught: state.caught, lost: state.lost }
        : {}),
    };
  }
  if (state.challenge) {
    return { ...result, challenge: done ? null : state.challenge };
  }
  const question = state.questions[state.index];
  return {
    ...result,
    progress: state.index,
    total: state.questions.length,
    question: done
      ? null
      : {
          text: question.text,
          options: question.options,
          ...(question.icons ? { icons: question.icons } : {}),
        },
    ...(!done && isTimed(attempt.game)
      ? {
          timeLimit: QUESTION_TIME / 1000,
          timeRemaining: Math.max(0, state.questionDeadline - now),
        }
      : {}),
  };
}

async function duelList(db, eventId, userId, now) {
  const rows = await all(
    db,
    `
    SELECT d.id,d.sender_id,d.receiver_id,d.expires,s.name AS senderName,r.name AS receiverName,
      sa.raw_score AS senderScore,ra.raw_score AS receiverScore
    FROM competition_duels d
    JOIN users s ON s.id=d.sender_id JOIN users r ON r.id=d.receiver_id
    LEFT JOIN competition_attempts sa ON sa.event_id=d.event_id AND sa.duel_id=d.id AND sa.user_id=d.sender_id
    LEFT JOIN competition_attempts ra ON ra.event_id=d.event_id AND ra.duel_id=d.id AND ra.user_id=d.receiver_id
    WHERE d.event_id=? AND (d.sender_id=? OR d.receiver_id=?)
    ORDER BY d.expires DESC LIMIT 30
  `,
    eventId,
    userId,
    userId,
  );
  return rows.map((row) => {
    const done = row.senderScore !== null && row.receiverScore !== null;
    const expired = row.expires <= now;
    const fromMe = row.sender_id === userId;
    return {
      id: row.id,
      fromMe,
      opponent: {
        userId: fromMe ? row.receiver_id : row.sender_id,
        name: fromMe ? row.receiverName : row.senderName,
      },
      myDone: (fromMe ? row.senderScore : row.receiverScore) !== null,
      expired,
      scores:
        done || expired
          ? {
              [row.sender_id]: row.senderScore,
              [row.receiver_id]: row.receiverScore,
            }
          : null,
    };
  });
}

async function board(db, context, userId, now) {
  const { event, year } = context;
  const closed = event.status === "archived" || now >= yearEnd(year);
  const totals = await all(
    db,
    `
    SELECT game,COUNT(*) AS attempts,MAX(score) AS best FROM competition_attempts
    WHERE event_id=? AND user_id=? AND duel_id='' GROUP BY game
  `,
    event.id,
    userId,
  );
  const active =
    event.approved && !closed
      ? await all(
          db,
          `
    SELECT * FROM competition_attempts WHERE event_id=? AND user_id=?
      AND raw_score IS NULL AND expires>?
  `,
          event.id,
          userId,
          now,
        )
      : [];
  const leaderboard = await getLeaderboard(db, event);
  return json({
    year,
    closed,
    canPlay: !!event.approved,
    joined: !!event.approved,
    games: Object.entries(games).map(([key, game]) => {
      const total = totals.find((item) => item.game === key);
      return {
        id: key,
        ...game,
        limit: multipliers.length,
        attempts: total?.attempts ?? 0,
        best: total?.best ?? null,
      };
    }),
    leaderboard,
    duels: event.approved ? await duelList(db, event.id, userId, now) : [],
    active: active.map((attempt) => publicAttempt(attempt, now)),
  });
}

function requireActive(context, now) {
  if (!context.event.approved)
    throw new HttpError("Serve un’iscrizione approvata all’evento.", 403);
  if (context.event.status === "archived" || now >= yearEnd(context.year))
    throw new HttpError("Questa edizione è conclusa.", 409);
}

async function startGame(db, context, body, userId, now) {
  const { event, year } = context;
  const game = body?.game;
  const duelId = game === "duel" ? safeText(body?.duelId, 64, true) : "";
  let duel;
  if (duelId) {
    duel = await first(
      db,
      `
      SELECT questions,expires FROM competition_duels
      WHERE id=? AND event_id=? AND expires>? AND (sender_id=? OR receiver_id=?)
    `,
      duelId,
      event.id,
      now,
      userId,
      userId,
    );
    if (!duel)
      throw new HttpError("Questo duello è scaduto o non è per te.", 403);
  } else if (typeof game !== "string" || !Object.hasOwn(games, game)) {
    throw new HttpError("Scegli una prova dall’elenco.");
  }
  const latest = () =>
    first(
      db,
      `
    SELECT * FROM competition_attempts
    WHERE event_id=? AND user_id=? AND game=? AND duel_id=?
    ORDER BY ordinal DESC LIMIT 1
  `,
      event.id,
      userId,
      game,
      duelId,
    );
  const previous = await latest();
  if (previous && previous.raw_score === null && previous.expires > now) {
    const state = JSON.parse(previous.state);
    const replacement =
      body.replaceLegacyAttempt === previous.id &&
      (state.edition ?? 0) < interactiveEdition
        ? newInteractiveChallenge(game)
        : null;
    if (replacement) {
      await run(
        db,
        `UPDATE competition_attempts SET state=?,expires=?,revision=revision+1
         WHERE id=? AND revision=? AND raw_score IS NULL AND expires>? AND ${stillOpen}`,
        JSON.stringify(replacement),
        Math.min(now + DAY, yearEnd(year)),
        previous.id,
        previous.revision,
        now,
      );
      return json({ attempt: publicAttempt(await latest(), now) });
    }
    if (game === "memory") {
      if (state.deck.length !== memoryCardCount) {
        await run(
          db,
          `UPDATE competition_attempts SET state=?,revision=revision+1 WHERE id=? AND revision=? AND raw_score IS NULL AND expires>? AND ${stillOpen}`,
          JSON.stringify(newRankedMemory(state.mistakes)),
          previous.id,
          previous.revision,
          now,
        );
        return json({ attempt: publicAttempt(await latest(), now) });
      }
    }
    if (isTimed(game)) {
      if (!state.questionDeadline) {
        state.questionDeadline = now + QUESTION_TIME;
        await run(
          db,
          `UPDATE competition_attempts SET state=?,revision=revision+1 WHERE id=? AND revision=? AND raw_score IS NULL AND ${stillOpen}`,
          JSON.stringify(state),
          previous.id,
          previous.revision,
        );
        return json({ attempt: publicAttempt(await latest(), now) });
      }
    }
    return json({ attempt: publicAttempt(previous, now) });
  }
  const ordinal = (previous?.ordinal || 0) + 1;
  if (ordinal > (duel ? 1 : multipliers.length)) {
    throw new HttpError("Hai usato tutti i tentativi per questa prova.", 409);
  }
  const state =
    game === "memory"
      ? newRankedMemory()
      : (newInteractiveChallenge(game) ??
        officialChallenge(game) ?? {
          questions: duel
            ? JSON.parse(duel.questions)
            : game === "film"
              ? createMovieQuestions(10, shuffled)
              : questionSet(),
          index: 0,
          correct: 0,
          ...(isTimed(game) ? { questionDeadline: now + QUESTION_TIME } : {}),
        });
  const expiry = Math.min(duel ? duel.expires : now + DAY, yearEnd(year));
  await run(
    db,
    `
    INSERT INTO competition_attempts(id,event_id,user_id,game,duel_id,ordinal,state,expires)
    SELECT ?,id,?,?,?,?,?,? FROM events WHERE id=? AND status<>'archived'
    ON CONFLICT(event_id,user_id,game,duel_id,ordinal) DO NOTHING
  `,
    id(),
    userId,
    game,
    duelId,
    ordinal,
    JSON.stringify(state),
    expiry,
    event.id,
  );
  const started = await latest();
  if (started?.ordinal !== ordinal)
    throw new HttpError("Questa edizione è conclusa.", 409);
  return json({ attempt: publicAttempt(started, now) });
}

function newRankedMemory(mistakes = 0) {
  return { deck: createMemoryDeck(), open: [], matched: [], mistakes };
}

function turnMemory(state, body) {
  if (state.deck.length !== memoryCardCount)
    throw new HttpError(
      "Il Memory ha una nuova griglia. Riapri la partita per continuare.",
      409,
    );
  if (body?.cover === true) {
    if (state.open.length !== 2)
      throw new HttpError("Gira due carte prima di coprirle.");
    state.open = [];
    return null;
  }
  const position = body?.position;
  if (
    !Number.isInteger(position) ||
    position < 0 ||
    position >= state.deck.length ||
    state.open.length === 2 ||
    state.open.includes(position) ||
    state.matched.includes(position)
  ) {
    throw new HttpError("Scegli una carta ancora coperta.");
  }
  state.open.push(position);
  if (state.open.length < 2) return null;
  if (state.deck[state.open[0]] === state.deck[position]) {
    state.matched.push(...state.open);
    state.open = [];
  } else {
    state.mistakes++;
  }
  return state.matched.length === state.deck.length
    ? Math.max(0, games.memory.points - 20 * state.mistakes)
    : null;
}

function turnQuiz(state, game, body, now) {
  const question = state.questions[state.index],
    choice = body?.choice,
    timed = isTimed(game),
    expired = timed && now >= (state.questionDeadline ?? now + QUESTION_TIME);
  if (!expired) {
    if (timed && (body?.timeout === true || choice === -1))
      throw new HttpError("Hai ancora tempo per rispondere.", 409);
    if (
      !Number.isInteger(choice) ||
      choice < 0 ||
      choice >= question.options.length
    ) {
      throw new HttpError("Scegli una delle risposte proposte.");
    }
    if (choice === question.answer) state.correct++;
  }
  state.index++;
  if (timed) state.questionDeadline = now + QUESTION_TIME;
  const points = game === "duel" ? 100 : games[game].points;
  return state.index === state.questions.length
    ? Math.round((points * state.correct) / state.questions.length)
    : null;
}

async function gameAction(db, context, body, userId, now) {
  const { event } = context;
  const attempt = await first(
    db,
    "SELECT * FROM competition_attempts WHERE id=? AND event_id=? AND user_id=?",
    safeText(body?.attemptId, 64, true),
    event.id,
    userId,
  );
  if (!attempt) throw new HttpError("Questa partita non è tua.", 403);
  if (attempt.raw_score !== null)
    return json({ attempt: publicAttempt(attempt, now) });
  if (attempt.expires <= now)
    throw new HttpError("Il tempo per questa partita è scaduto.", 410);
  if (body?.revision !== attempt.revision)
    throw new HttpError(
      "La partita è cambiata. Riprendila dalla scheda Sfide.",
      409,
    );
  const state = JSON.parse(attempt.state);
  const rawScore =
    attempt.game === "memory"
      ? turnMemory(state, body)
      : state.interactive
        ? turnInteractiveChallenge(state, body, now, shuffled)
        : state.challenge
          ? scoreOfficialChallenge(state, body?.solution)
          : turnQuiz(state, attempt.game, body, now);
  const score =
    rawScore === null || attempt.duel_id
      ? null
      : Math.round(rawScore * multipliers[attempt.ordinal - 1]);
  const update = stmt(
    db,
    `
    UPDATE competition_attempts SET state=?,raw_score=?,score=?,revision=revision+1
    WHERE id=? AND revision=? AND raw_score IS NULL AND expires>? AND ${stillOpen}
  `,
    JSON.stringify(state),
    rawScore,
    score,
    attempt.id,
    attempt.revision,
    now,
  );
  const stamp =
    rawScore !== null && ["quiz", "memory"].includes(attempt.game)
      ? attempt.game
      : null;
  const changes = stamp
    ? (
        await db.batch([
          update,
          stmt(
            db,
            `
          INSERT INTO user_stamps(user_id,stamp,collected_at)
          SELECT user_id,?,? FROM competition_attempts WHERE id=? AND raw_score IS NOT NULL
          ON CONFLICT(user_id,stamp) DO NOTHING
        `,
            stamp,
            now,
            attempt.id,
          ),
        ])
      )[0].meta.changes
    : (await update.run()).meta.changes;
  if (!changes)
    throw new HttpError(
      "La partita è cambiata. Riprendila dalla scheda Sfide.",
      409,
    );
  const current = await first(
    db,
    "SELECT * FROM competition_attempts WHERE id=?",
    attempt.id,
  );
  return json({
    attempt: publicAttempt(current, now),
    ...(stamp ? { stamp } : {}),
  });
}

async function adjust(db, context, body, ownerId, now) {
  const { event } = context;
  if (event.owner_id !== ownerId)
    throw new HttpError("I punti li gestisce chi organizza l’evento.", 403);
  if (event.status === "archived")
    throw new HttpError("Questa edizione è conclusa.", 409);
  const kind = body?.kind,
    userId = safeText(body?.userId, 64, true);
  const reason = safeText(body?.reason, 300, true);
  const points = kind === "reset" ? 0 : body?.points;
  if (
    !["add", "subtract", "reset"].includes(kind) ||
    (kind !== "reset" &&
      (!Number.isInteger(points) || points < 1 || points > 1000))
  ) {
    throw new HttpError("Scegli un’azione e indica da 1 a 1000 punti.");
  }
  const member = await first(
    db,
    "SELECT 1 FROM members WHERE event_id=? AND user_id=? AND status='approved'",
    event.id,
    userId,
  );
  if (!member)
    throw new HttpError(
      "La persona non ha un’iscrizione approvata all’evento.",
      404,
    );
  const delta = kind === "subtract" ? -points : points;
  const update =
    kind === "reset"
      ? stmt(
          db,
          `
      INSERT INTO competition_entries(event_id,user_id,adjustment)
      SELECT e.id,?, -(SELECT COALESCE(SUM(best),0) FROM (
          SELECT MAX(score) AS best FROM competition_attempts
          WHERE event_id=e.id AND user_id=? AND duel_id='' GROUP BY game
        )) - ${stampCountSql("?", seasonEndSql)}
      FROM events e WHERE e.id=? AND e.status<>'archived'
      ON CONFLICT(event_id,user_id) DO UPDATE SET adjustment=excluded.adjustment
    `,
          userId,
          userId,
          userId,
          ...collectibleStamps,
          event.id,
        )
      : stmt(
          db,
          `INSERT INTO competition_entries(event_id,user_id,adjustment)
          SELECT id,?,? FROM events WHERE id=? AND status<>'archived'
          ON CONFLICT(event_id,user_id) DO UPDATE SET adjustment=adjustment+excluded.adjustment`,
          userId,
          delta,
          event.id,
        );
  const [saved] = await db.batch([
    update,
    stmt(
      db,
      `INSERT INTO competition_adjustments(id,event_id,user_id,owner_id,action,points,reason,created_at)
      SELECT ?,id,?,?,?,?,?,? FROM events WHERE id=? AND status<>'archived'`,
      id(),
      userId,
      ownerId,
      kind,
      points,
      reason,
      now,
      event.id,
    ),
  ]);
  if (!saved.meta.changes)
    throw new HttpError("Questa edizione è conclusa.", 409);
  return json({ leaderboard: await getLeaderboard(db, event) });
}

async function createDuel(db, context, body, senderId, now) {
  const { event, year } = context;
  const receiverId = safeText(body?.userId, 64, true);
  if (senderId === receiverId)
    throw new HttpError("Scegli un’altra persona da sfidare.");
  const receiver = await first(
    db,
    `
    SELECT 1 FROM members WHERE event_id=? AND user_id=? AND status='approved'
  `,
    event.id,
    receiverId,
  );
  if (!receiver)
    throw new HttpError(
      "Puoi sfidare chi ha un’iscrizione approvata a questo evento.",
      403,
    );
  const duelId = id();
  const created = await run(
    db,
    `
    INSERT INTO competition_duels(id,event_id,sender_id,receiver_id,questions,expires)
    SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM events WHERE id=? AND status<>'archived') AND NOT EXISTS (
      SELECT 1 FROM competition_duels
      WHERE event_id=? AND expires>?
        AND ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?))
        AND (SELECT COUNT(*) FROM competition_attempts a WHERE a.duel_id=competition_duels.id AND a.raw_score IS NOT NULL)<2
    )
  `,
    duelId,
    event.id,
    senderId,
    receiverId,
    JSON.stringify(questionSet()),
    Math.min(now + 2 * DAY, yearEnd(year)),
    event.id,
    event.id,
    now,
    senderId,
    receiverId,
    receiverId,
    senderId,
  );
  if (!created.meta.changes)
    throw new HttpError("Avete già un duello aperto.", 409);
  return json({ duelId }, 201);
}

export async function competitionRoute(request, env, path, body, user) {
  const parts = path.match(
    /^\/api\/competition\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/,
  );
  if (!parts) throw new HttpError("Questa pagina non esiste.", 404);
  const [, eventId, action, duelId] = parts;
  const db = env.DB,
    now = Date.now();
  const context = await access(db, eventId, user.id);
  if (action === "tris-duels")
    return trisDuelsRoute(
      request,
      db,
      context,
      duelId,
      body,
      user.id,
      now,
      yearEnd(context.year),
    );
  if (duelId) throw new HttpError("Questa pagina non esiste.", 404);
  if (request.method === "GET" && !action)
    return board(db, context, user.id, now);
  if (request.method !== "POST")
    throw new HttpError("Metodo non disponibile.", 405);
  if (action === "adjust") return adjust(db, context, body, user.id, now);
  requireActive(context, now);
  if (action === "join") {
    await run(
      db,
      "INSERT INTO competition_entries(event_id,user_id) SELECT id,? FROM events WHERE id=? AND status<>'archived' ON CONFLICT DO NOTHING",
      user.id,
      context.event.id,
    );
    return json({ joined: true });
  }
  if (action === "start") return startGame(db, context, body, user.id, now);
  if (action === "action") return gameAction(db, context, body, user.id, now);
  if (action === "duels") return createDuel(db, context, body, user.id, now);
  throw new HttpError("Questa pagina non esiste.", 404);
}
