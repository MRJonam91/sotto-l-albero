import { first, run } from "./auth.js";
import { captureFestiveProgress } from "./holidayActivity.js";
import { HttpError, json, token } from "./security.js";
import { createMemoryDeck, memoryCardCount } from "../shared/memory.js";
import { createMovieQuestions } from "../shared/christmasMovies.js";
import { gameCatalog } from "../shared/gameCatalog.js";
import {
  officialChallenge,
  scoreOfficialChallenge,
} from "../shared/officialChallenges.js";
import {
  newInteractiveChallenge,
  publicInteractiveChallenge,
  turnInteractiveChallenge,
} from "./interactiveChallenges.js";

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const limit = 4294967296 - (4294967296 % (i + 1));
    let value;
    do {
      value = crypto.getRandomValues(new Uint32Array(1))[0];
    } while (value >= limit);
    const j = value % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const QUESTION_TIME = 20_000;
const questions = [
  [
    "Quale di questi è un dolce natalizio?",
    ["Tiramisù", "Panettone", "Cannolo"],
    1,
    "Il panettone si riconosce dalla cupola. Nella ricetta classica trovi uvetta e canditi.",
  ],
  [
    "Chi riempie le calze il 6 gennaio nella tradizione italiana?",
    ["Babbo Natale", "La Befana", "Lo schiaccianoci"],
    1,
    "La Befana arriva nella notte dell’Epifania.",
  ],
  [
    "Come si chiama la sera del 24 dicembre?",
    ["Capodanno", "Santo Stefano", "Vigilia di Natale"],
    2,
    "La Vigilia precede il giorno di Natale.",
  ],
  [
    "Nella tombola, come si chiama il risultato di tre numeri sulla stessa riga?",
    ["Ambo", "Terno", "Quaterna"],
    1,
    "Il terno vale tre numeri.",
  ],
  [
    "Ho sei punte, cado dal cielo e sulla mano mi sciolgo. Che cosa sono?",
    ["Un fiocco di neve", "Una stella di carta", "Una caramella"],
    0,
    "I cristalli di neve crescono secondo una simmetria a sei punte.",
  ],
];

function newState(game, now) {
  if (game === "quiz")
    return { index: 0, score: 0, questionDeadline: now + QUESTION_TIME };
  if (game === "film")
    return {
      questions: createMovieQuestions(10, shuffled),
      index: 0,
      score: 0,
      questionDeadline: now + QUESTION_TIME,
    };
  if (game !== "memory") {
    const challenge = newInteractiveChallenge(game) ?? officialChallenge(game);
    if (!challenge)
      throw new HttpError("Questo allenamento non è ancora disponibile.", 409);
    return challenge;
  }
  return {
    deck: createMemoryDeck(),
    open: [],
    paired: [],
    feedback: "Gira due carte e cerca le coppie.",
  };
}

function view(game, state, revision, now) {
  if (game !== "quiz" && game !== "memory" && game !== "film") {
    const done = state.practiceScore !== undefined;
    return {
      revision,
      done,
      challenge:
        done && game !== "tris"
          ? null
          : state.interactive
            ? publicInteractiveChallenge(state, now)
            : state.challenge,
      ...(done ? { score: state.practiceScore } : {}),
    };
  }
  if (game === "quiz") {
    const question = questions[state.index];
    return {
      revision,
      done: !question,
      index: state.index,
      total: questions.length,
      timeLimit: QUESTION_TIME / 1000,
      timeRemaining: state.questionDeadline
        ? Math.max(0, state.questionDeadline - now)
        : null,
      ...(question
        ? { question: { title: question[0], options: question[1] } }
        : { score: state.score }),
    };
  }
  if (game === "film") {
    const question = state.questions[state.index];
    return {
      revision,
      done: !question,
      index: state.index,
      total: state.questions.length,
      timeLimit: QUESTION_TIME / 1000,
      timeRemaining: state.questionDeadline
        ? Math.max(0, state.questionDeadline - now)
        : null,
      ...(question
        ? {
            question: {
              title: question.text,
              prompt: question.prompt,
              icons: question.icons,
              options: question.options,
            },
          }
        : { score: state.score }),
    };
  }
  return {
    revision,
    done: state.paired.length === state.deck.length,
    feedback: state.feedback,
    cover: state.open.length === 2,
    cards: state.deck.map((name, i) => ({
      name: state.open.includes(i) || state.paired.includes(i) ? name : null,
      paired: state.paired.includes(i),
    })),
  };
}

function advanceQuiz(state, choice, timeout, now) {
  const [, options, answer, note] = questions[state.index];
  if (!state.questionDeadline)
    throw new HttpError("Apri la domanda per continuare.", 409);
  const expired = now >= state.questionDeadline;
  state.questionDeadline = null;
  if (expired) {
    state.index++;
    return {
      choice: -1,
      answer,
      text: `Tempo scaduto! La risposta era ${options[answer]}. ${note}`,
    };
  }
  if (timeout === true || choice === -1)
    throw new HttpError("Hai ancora tempo per rispondere.", 409);
  if (!Number.isInteger(choice) || choice < 0 || choice >= options.length)
    throw new HttpError("Scegli una delle risposte.");
  state.index++;
  if (choice === answer) state.score++;
  return {
    choice,
    answer,
    text: `${choice === answer ? "Esatto!" : `La risposta è ${options[answer]}.`} ${note}`,
  };
}

function advanceFilm(state, choice, timeout, now) {
  const question = state.questions[state.index];
  if (!state.questionDeadline)
    throw new HttpError("Apri la domanda per continuare.", 409);
  const expired = now >= state.questionDeadline;
  state.questionDeadline = null;
  const correctTitle = question.options[question.answer];
  if (expired) {
    state.index++;
    return {
      choice: -1,
      answer: question.answer,
      correct: false,
      title: correctTitle,
      year: question.year,
      note: question.note,
      text: `Tempo scaduto! Il film era ${correctTitle} (${question.year}). ${question.note}`,
    };
  }
  if (timeout === true || choice === -1)
    throw new HttpError("Hai ancora tempo per rispondere.", 409);
  if (
    !Number.isInteger(choice) ||
    choice < 0 ||
    choice >= question.options.length
  )
    throw new HttpError("Scegli una delle risposte.");
  const correct = choice === question.answer;
  state.index++;
  if (correct) state.score++;
  return {
    choice,
    answer: question.answer,
    correct,
    title: correctTitle,
    year: question.year,
    note: question.note,
    text: `${correct ? "Esatto!" : `La risposta è ${correctTitle} (${question.year}).`} ${question.note}`,
  };
}

function advanceMemory(state, body) {
  if (body.cover === true) {
    if (state.open.length !== 2)
      throw new HttpError("Gira due carte prima di coprirle.");
    state.open = [];
    state.feedback = "Le carte sono coperte. Scegline due.";
    return;
  }
  const i = body.position;
  if (
    !Number.isInteger(i) ||
    i < 0 ||
    i >= state.deck.length ||
    state.open.length === 2 ||
    state.open.includes(i) ||
    state.paired.includes(i)
  )
    throw new HttpError("Scegli una carta ancora coperta.");
  const name = state.deck[i].toLowerCase(),
    firstCard = state.open[0];
  if (firstCard === undefined) {
    state.open.push(i);
    state.feedback = `Carta ${i + 1}: ${name}. Gira un’altra carta.`;
  } else if (state.deck[firstCard] === state.deck[i]) {
    state.paired.push(firstCard, i);
    state.open = [];
    state.feedback = `Coppia trovata: ${name}.`;
  } else {
    state.open.push(i);
    state.feedback = `${state.deck[firstCard]} e ${name}. Copri le carte e riprova.`;
  }
}

export async function practiceAllowed(db, userId) {
  return !!(await first(
    db,
    "SELECT 1 FROM members WHERE user_id=? AND status='approved' LIMIT 1",
    userId,
  ));
}

export async function practiceRoute(request, env, path, body, user) {
  const db = env.DB;
  if (path === "/api/practice/access") {
    if (request.method !== "GET")
      throw new HttpError("Metodo non disponibile.", 405);
    return json({ allowed: await practiceAllowed(db, user.id) });
  }
  if (path === "/api/practice/catalog") {
    if (request.method !== "GET")
      throw new HttpError("Metodo non disponibile.", 405);
    return json({
      allowed: await practiceAllowed(db, user.id),
      games: gameCatalog
        .filter((game) => game.practiceEngine !== "local")
        .map(({ id, name }) => ({ id, name })),
    });
  }
  const match =
    /^\/api\/practice\/(quiz|memory|pacchi|slitta|cartolina|addobbi|tris|film)\/(start|step)$/.exec(
      path,
    );
  if (!match || request.method !== "POST")
    throw new HttpError("Partita non disponibile.", 404);
  if (!(await practiceAllowed(db, user.id)))
    throw new HttpError(
      "Per giocare serve un’iscrizione approvata a un evento.",
      403,
    );
  const [, game, action] = match;
  const now = Date.now();
  const find = () =>
    first(
      db,
      "SELECT revision,state,done FROM practice_games WHERE user_id=? AND game=?",
      user.id,
      game,
    );
  if (action === "start") {
    const initial = JSON.stringify(newState(game, now));
    if (body?.reset === true && typeof body.revision === "string") {
      const previous = await find();
      if (previous?.done && previous.revision === body.revision)
        await captureFestiveProgress(db, user.id);
      await run(
        db,
        "UPDATE practice_games SET revision=?,state=?,done=0 WHERE user_id=? AND game=? AND revision=?",
        token(),
        initial,
        user.id,
        game,
        body.revision,
      );
    } else {
      await run(
        db,
        "INSERT INTO practice_games(user_id,game,revision,state) VALUES(?,?,?,?) ON CONFLICT(user_id,game) DO NOTHING",
        user.id,
        game,
        token(),
        initial,
      );
    }
    let current = await find();
    if (
      game === "memory" &&
      !current.done &&
      JSON.parse(current.state).deck.length !== memoryCardCount
    ) {
      await run(
        db,
        "UPDATE practice_games SET revision=?,state=? WHERE user_id=? AND game=? AND revision=? AND done=0",
        token(),
        initial,
        user.id,
        game,
        current.revision,
      );
      current = await find();
    }
    if ((game === "quiz" || game === "film") && !current.done) {
      const state = JSON.parse(current.state);
      if (!state.questionDeadline) {
        state.questionDeadline = now + QUESTION_TIME;
        await run(
          db,
          "UPDATE practice_games SET revision=?,state=? WHERE user_id=? AND game=? AND revision=? AND done=0",
          token(),
          JSON.stringify(state),
          user.id,
          game,
          current.revision,
        );
        current = await find();
      }
    }
    return json(view(game, JSON.parse(current.state), current.revision, now));
  }
  const current = await find();
  if (!current || current.done || current.revision !== body?.revision)
    throw new HttpError("La partita è cambiata. Riaprila per continuare.", 409);
  const state = JSON.parse(current.state);
  if (game === "memory" && state.deck.length !== memoryCardCount)
    throw new HttpError(
      "Il Memory ha una nuova griglia. Riapri la partita per continuare.",
      409,
    );
  let feedback;
  if (game === "quiz")
    feedback = advanceQuiz(state, body.choice, body.timeout, now);
  else if (game === "film")
    feedback = advanceFilm(state, body.choice, body.timeout, now);
  else if (game === "memory") advanceMemory(state, body);
  else {
    const score = state.interactive
      ? turnInteractiveChallenge(state, body, now, shuffled)
      : scoreOfficialChallenge(state, body?.solution);
    if (score !== null) state.practiceScore = score;
  }
  const revision = token(),
    result = view(game, state, revision, now);
  const changed = await run(
    db,
    "UPDATE practice_games SET revision=?,state=?,done=? WHERE user_id=? AND game=? AND revision=?",
    revision,
    JSON.stringify(state),
    Number(result.done),
    user.id,
    game,
    current.revision,
  );
  if (!changed.meta.changes)
    throw new HttpError("La partita è cambiata. Riaprila per continuare.", 409);
  if (result.done) await captureFestiveProgress(db, user.id);
  return json({ ...result, ...(feedback ? { feedback } : {}) });
}
