import { all, first, run } from "./auth.js";
import { HttpError, id, json, safeText } from "./security.js";
import { createMemoryDeck, memoryCardCount } from "../shared/memory.js";
import { quizQuestions } from "../shared/quizQuestions.js";

const DAY = 86_400_000;
const multipliers = [1, 0.95, 0.9];
const games = {
  quiz: { name: "Quiz di Natale", points: 300 },
  memory: { name: "Memory di Natale", points: 300 },
  pacchi: { name: "Pacchi smarriti", points: 100 },
  slitta: { name: "Sacco della slitta", points: 100 },
  cartolina: { name: "Cartolina cifrata", points: 100 },
  addobbi: { name: "Addobbi in ordine", points: 100 },
};

const questions = quizQuestions;

const puzzles = {
  pacchi: [
    "Il pacco tondo è per Nina. Il libro va a Teo. Il pacco rimasto è un paio di guanti: a chi va, se manca solo Lea?",
    ["A Nina", "A Lea", "A Teo"],
    1,
  ],
  slitta: [
    "Restano 5 kg sulla slitta. Il libro pesa 2 kg, la tazza 3 e il gioco 4. Quali due regali riempiono lo spazio senza superare il limite?",
    ["Il libro e la tazza", "Il libro e il gioco", "La tazza e il gioco"],
    0,
  ],
  cartolina: [
    "La cartolina è scritta al contrario: E T S E F. Quale parola nasconde?",
    ["Fuochi", "Fette", "Feste"],
    2,
  ],
  addobbi: [
    "La stella viene dopo il fiocco. La campanella viene prima del fiocco. In che ordine appendi gli addobbi?",
    [
      "Fiocco, stella, campanella",
      "Campanella, fiocco, stella",
      "Stella, campanella, fiocco",
    ],
    1,
  ],
};

const romeYear = new Intl.DateTimeFormat("it-IT", {
  year: "numeric",
  timeZone: "Europe/Rome",
});
const yearOf = (event) => Number(romeYear.format(new Date(event.gift_at)));
const yearStart = (year) => `${year - 1}-12-31T23:00:00.000Z`;
const yearEnd = (year) => Date.parse(yearStart(year + 1));
const stmt = (db, query, ...args) => db.prepare(query).bind(...args);

function shuffled(values) {
  const copy = [...values];
  const random = crypto.getRandomValues(new Uint32Array(copy.length));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = random[i] % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function questionSet(game) {
  const selected = Object.hasOwn(puzzles, game)
    ? [puzzles[game]]
    : shuffled(questions).slice(0, 10);
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
    )
    SELECT u.id AS userId,u.name,c.adjustment,
      MAX(0,COALESCE(SUM(best.score),0)+c.adjustment) AS score,
      COALESCE(MAX(CASE WHEN best.game='quiz' THEN best.score END),0) AS quiz,
      COALESCE(MAX(CASE WHEN best.game='memory' THEN best.score END),0) AS memory
    FROM competition_entries c
    JOIN users u ON u.id=c.user_id
    JOIN members m ON m.event_id=c.event_id AND m.user_id=c.user_id AND m.status='approved'
    LEFT JOIN best ON best.user_id=c.user_id
    WHERE c.event_id=?
    GROUP BY u.id,u.name,c.adjustment
    ORDER BY score DESC,u.name COLLATE NOCASE,u.id
  `,
    event.id,
    event.id,
  );
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || rows[index - 1].score !== row.score) rank = index + 1;
    return { ...row, rank };
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
  const year = yearOf(event);
  return {
    event,
    year,
    entry: await first(
      db,
      "SELECT adjustment FROM competition_entries WHERE event_id=? AND user_id=?",
      event.id,
      userId,
    ),
  };
}

function publicAttempt(attempt) {
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
  const question = state.questions[state.index];
  return {
    ...result,
    progress: state.index,
    total: state.questions.length,
    question: done ? null : { text: question.text, options: question.options },
    timeLimit: 20,
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
  const { event, year, entry } = context;
  const totals = await all(
    db,
    `
    SELECT game,COUNT(*) AS attempts,MAX(score) AS best FROM competition_attempts
    WHERE event_id=? AND user_id=? AND duel_id='' GROUP BY game
  `,
    event.id,
    userId,
  );
  const active = entry
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
    closed: now >= yearEnd(year),
    canPlay: !!event.approved,
    joined: !!entry,
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
    duels: entry ? await duelList(db, event.id, userId, now) : [],
    active: active.map(publicAttempt),
  });
}

function requireActive(context, now) {
  if (!context.event.approved)
    throw new HttpError("Serve un’iscrizione approvata all’evento.", 403);
  if (now >= yearEnd(context.year))
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
    if (game === "memory") {
      const state = JSON.parse(previous.state);
      if (state.deck.length !== memoryCardCount) {
        await run(
          db,
          "UPDATE competition_attempts SET state=?,revision=revision+1 WHERE id=? AND revision=? AND raw_score IS NULL AND expires>?",
          JSON.stringify(newRankedMemory(state.mistakes)),
          previous.id,
          previous.revision,
          now,
        );
        return json({ attempt: publicAttempt(await latest()) });
      }
    }
    return json({ attempt: publicAttempt(previous) });
  }
  const ordinal = (previous?.ordinal || 0) + 1;
  if (ordinal > (duel ? 1 : multipliers.length)) {
    throw new HttpError("Hai usato tutti i tentativi per questa prova.", 409);
  }
  const state =
    game === "memory"
      ? newRankedMemory()
      : {
          questions: duel ? JSON.parse(duel.questions) : questionSet(game),
          index: 0,
          correct: 0,
        };
  const expiry = Math.min(duel ? duel.expires : now + DAY, yearEnd(year));
  await run(
    db,
    `
    INSERT INTO competition_attempts(id,event_id,user_id,game,duel_id,ordinal,state,expires)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(event_id,user_id,game,duel_id,ordinal) DO NOTHING
  `,
    id(),
    event.id,
    userId,
    game,
    duelId,
    ordinal,
    JSON.stringify(state),
    expiry,
  );
  return json({ attempt: publicAttempt(await latest()) });
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

function turnQuiz(state, game, body) {
  const question = state.questions[state.index],
    choice = body?.choice,
    isTimeout = body?.timeout === true || choice === -1;
  if (!isTimeout) {
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
    return json({ attempt: publicAttempt(attempt) });
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
      : turnQuiz(state, attempt.game, body);
  const score =
    rawScore === null || attempt.duel_id
      ? null
      : Math.round(rawScore * multipliers[attempt.ordinal - 1]);
  const update = stmt(
    db,
    `
    UPDATE competition_attempts SET state=?,raw_score=?,score=?,revision=revision+1
    WHERE id=? AND revision=? AND raw_score IS NULL AND expires>?
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
          INSERT INTO user_stamps(user_id,stamp)
          SELECT user_id,? FROM competition_attempts WHERE id=? AND raw_score IS NOT NULL
          ON CONFLICT(user_id,stamp) DO NOTHING
        `,
            stamp,
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
  return json({ attempt: publicAttempt(current), ...(stamp ? { stamp } : {}) });
}

async function adjust(db, context, body, ownerId, now) {
  const { event } = context;
  if (event.owner_id !== ownerId)
    throw new HttpError("I punti li gestisce chi organizza l’evento.", 403);
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
  const entry = await first(
    db,
    `SELECT 1 FROM competition_entries c
     JOIN members m ON m.event_id=c.event_id AND m.user_id=c.user_id AND m.status='approved'
     WHERE c.event_id=? AND c.user_id=?`,
    event.id,
    userId,
  );
  if (!entry)
    throw new HttpError("La persona non è iscritta alla classifica.", 404);
  const delta = kind === "subtract" ? -points : points;
  const update =
    kind === "reset"
      ? stmt(
          db,
          `
      UPDATE competition_entries SET adjustment=-(SELECT COALESCE(SUM(best),0) FROM (
        SELECT MAX(score) AS best FROM competition_attempts
        WHERE event_id=? AND user_id=? AND duel_id='' GROUP BY game
      )) WHERE event_id=? AND user_id=?
    `,
          event.id,
          userId,
          event.id,
          userId,
        )
      : stmt(
          db,
          "UPDATE competition_entries SET adjustment=adjustment+? WHERE event_id=? AND user_id=?",
          delta,
          event.id,
          userId,
        );
  await db.batch([
    update,
    stmt(
      db,
      "INSERT INTO competition_adjustments(id,event_id,user_id,owner_id,action,points,reason,created_at) VALUES(?,?,?,?,?,?,?,?)",
      id(),
      event.id,
      userId,
      ownerId,
      kind,
      points,
      reason,
      now,
    ),
  ]);
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
    SELECT 1 FROM members m JOIN competition_entries c ON c.event_id=m.event_id AND c.user_id=m.user_id
    WHERE m.event_id=? AND m.user_id=? AND m.status='approved'
  `,
    event.id,
    receiverId,
  );
  if (!receiver)
    throw new HttpError(
      "Puoi sfidare chi è iscritto alle sfide di questo evento.",
      403,
    );
  const duelId = id();
  const created = await run(
    db,
    `
    INSERT INTO competition_duels(id,event_id,sender_id,receiver_id,questions,expires)
    SELECT ?,?,?,?,?,? WHERE NOT EXISTS (
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
    JSON.stringify(questionSet("duel")),
    Math.min(now + 2 * DAY, yearEnd(year)),
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
  const parts = path.match(/^\/api\/competition\/([^/]+)(?:\/([^/]+))?$/);
  if (!parts) throw new HttpError("Questa pagina non esiste.", 404);
  const [, eventId, action] = parts;
  const db = env.DB,
    now = Date.now();
  const context = await access(db, eventId, user.id);
  if (request.method === "GET" && !action)
    return board(db, context, user.id, now);
  if (request.method !== "POST")
    throw new HttpError("Metodo non disponibile.", 405);
  if (action === "adjust") return adjust(db, context, body, user.id, now);
  requireActive(context, now);
  if (action === "join") {
    await run(
      db,
      "INSERT INTO competition_entries(event_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING",
      context.event.id,
      user.id,
    );
    return json({ joined: true });
  }
  if (!context.entry)
    throw new HttpError("Iscriviti alle sfide del gruppo per giocare.", 403);
  if (action === "start") return startGame(db, context, body, user.id, now);
  if (action === "action") return gameAction(db, context, body, user.id, now);
  if (action === "duels") return createDuel(db, context, body, user.id, now);
  throw new HttpError("Questa pagina non esiste.", 404);
}
