import { HttpError } from "./security.js";

const beltWaves = 8;
const legacyBeltTime = 9_000;
const wavePoints = [8, 9, 10, 11, 12, 14, 16, 20];
export const interactiveEdition = 2;
const parcelIds = ["stella", "campanella", "albero", "biscotto", "renna"];

const rooms = [
  {
    title: "L’ufficio postale",
    lock: "digits",
    answer: "374",
    required: ["registro", "cartolina", "finestra", "scaffale"],
    objects: [
      [
        "registro",
        "Registro",
        "Un appunto del corriere: «Segna prima chi veglia alla finestra, poi il numero del marchio sulla ceralacca, per ultimi i pacchi che aspettano ancora.»",
      ],
      [
        "cartolina",
        "Cartolina",
        "È indirizzata ad Ada. Nella ceralacca è impresso un abete.",
      ],
      [
        "finestra",
        "Finestra",
        "Sul davanzale ci sono cinque candele. Due si sono spente.",
      ],
      [
        "scaffale",
        "Scaffale",
        "Sul fianco è inciso: stella 4, abete 7, campana 2. Sul registro di carico leggi 9 arrivi e 5 partenze. Dietro il cartellino trovi una lamina forata e la metti in tasca.",
      ],
      [
        "lampada",
        "Lampadario",
        "Fa una luce fioca. Sul vetro si è posato un velo di polvere.",
      ],
    ],
  },
  {
    title: "La stanza della lanterna",
    lock: "symbol",
    answer: "renna",
    required: ["mappa"],
    objects: [
      [
        "lampada",
        "Lanterna",
        "Sul telaio ci sono due guide sottili. La luce passa tutta da lì.",
      ],
      [
        "cartolina",
        "Cartolina sul banco",
        "L’inchiostro si è allargato. Sotto la macchia si intravedono due righe.",
      ],
      [
        "mappa",
        "Mappa dei passaggi",
        "Una freccia scende dalla prima casella in alto a sinistra a quella sotto. Poi risale alla colonna successiva. Il tratto si ripete fino al bordo.",
      ],
      [
        "porta",
        "Porta chiusa",
        "La maniglia si muove appena. Sul legno sono rimasti dei graffi.",
      ],
    ],
    options: [
      ["albero", "Albero"],
      ["renna", "Renna"],
      ["stella", "Stella"],
      ["campanella", "Campanella"],
    ],
  },
];

export function newInteractiveChallenge(game) {
  if (game === "cartolina")
    return {
      interactive: "escape",
      edition: interactiveEdition,
      rooms,
      room: 0,
      seen: [],
      mistakes: 0,
      wrong: false,
      hasPlate: false,
      lit: false,
      revealed: false,
    };
  if (game === "addobbi")
    return {
      interactive: "catch",
      edition: interactiveEdition,
      wave: 1,
      caught: 0,
      current: null,
      last: null,
      lost: 0,
      points: 0,
    };
  return null;
}

function canUnlock(state, room) {
  if (!state.edition) return state.seen.length === room.objects.length;
  return (
    room.required.every((id) => state.seen.includes(id)) &&
    (state.room === 0 || state.revealed)
  );
}

export function publicInteractiveChallenge(state, now) {
  if (state.interactive === "escape") {
    const room = state.rooms[state.room];
    const notes = room.objects
      .filter(([id]) => state.seen.includes(id))
      .map(([id, label, note]) => ({
        id,
        label,
        note:
          state.room === 1 && id === "cartolina" && state.revealed
            ? "La luce filtra dalla lamina. Riga in alto: R N A. Riga in basso: E N."
            : note,
      }));
    return {
      type: "escape",
      edition: state.edition ?? 1,
      title: room.title,
      room: state.room + 1,
      total: state.rooms.length,
      objects: room.objects.map(([id, label]) => ({ id, label })),
      notes,
      lock: room.lock,
      options: room.options,
      ready: canUnlock(state, room),
      hasPlate: state.hasPlate,
      lit: state.lit,
      revealed: state.revealed,
      mistakes: state.mistakes,
      wrong: state.wrong,
    };
  }
  return {
    type: "catch",
    edition: state.edition ?? 1,
    wave: state.wave,
    total: beltWaves,
    caught: state.caught,
    parcelIds: state.current?.parcelIds ?? [],
    target: state.current?.target ?? null,
    remaining: state.current ? Math.max(0, state.current.deadline - now) : null,
    duration: state.current?.duration ?? legacyBeltTime,
    ...(state.edition
      ? {
          lost: state.lost,
          points: Math.max(0, state.points),
          value: wavePoints[state.wave - 1],
        }
      : {}),
    last: state.last,
  };
}

function turnRoom(state, body) {
  const room = state.rooms[state.room];
  const { move, choice } = body;
  if (move === "use" && state.edition) {
    if (
      !state.hasPlate ||
      state.room !== 1 ||
      choice !== "lampada" ||
      !state.seen.includes("lampada")
    )
      throw new HttpError(
        "La lamina qui non trova appoggio. Guarda meglio l’oggetto.",
      );
    state.lit = true;
    return null;
  }
  if (move === "inspect") {
    if (!room.objects.some(([id]) => id === choice))
      throw new HttpError("Scegli un oggetto di questa stanza.");
    if (!state.seen.includes(choice)) state.seen.push(choice);
    if (state.edition && state.room === 0 && choice === "scaffale")
      state.hasPlate = true;
    if (state.room === 1 && state.lit && choice === "cartolina")
      state.revealed = true;
    return null;
  }
  if (move !== "unlock" || !canUnlock(state, room))
    throw new HttpError(
      "Guarda gli oggetti della stanza prima di provare ad aprire.",
    );
  if (
    room.lock === "digits"
      ? typeof choice !== "string" || !/^\d{3}$/.test(choice)
      : !room.options.some(([id]) => id === choice)
  )
    throw new HttpError("Scegli una combinazione valida.");
  state.wrong = choice !== room.answer;
  if (state.wrong) {
    state.mistakes++;
    return state.mistakes >= 7 ? 0 : null;
  }
  if (state.room === state.rooms.length - 1) return 100 - 15 * state.mistakes;
  state.room++;
  state.seen = [];
  return null;
}

function openWave(state, now, shuffle) {
  const candidates = shuffle(parcelIds);
  const target = candidates.find((id) => id !== state.current?.target);
  const duration = state.edition
    ? 6500 - (state.wave - 1) * 600
    : legacyBeltTime;
  state.current = {
    target,
    parcelIds: shuffle([
      target,
      ...candidates.filter((id) => id !== target).slice(0, 3),
    ]),
    deadline: now + duration,
    duration,
  };
}

function turnBelt(state, body, now, shuffle) {
  if (!state.current) {
    if (body.move !== "begin") throw new HttpError("Fai partire il nastro.");
    openWave(state, now, shuffle);
    return null;
  }
  const expired = now >= state.current.deadline;
  if (body.move === "timeout" && state.edition && !expired)
    throw new HttpError("Il pacco è ancora sul nastro.", 409);
  if (
    body.move !== "pass" &&
    !(body.move === "timeout" && state.edition) &&
    (body.move !== "catch" || !state.current.parcelIds.includes(body.choice))
  )
    throw new HttpError("Scegli un pacco sul nastro.");
  const caught =
    !expired && body.move === "catch" && body.choice === state.current.target;
  state.last = caught
    ? "caught"
    : expired || body.move === "pass"
      ? "missed"
      : "wrong";
  if (caught) state.caught++;
  if (state.edition) {
    if (caught) state.points += wavePoints[state.wave - 1];
    else {
      state.lost++;
      state.points -= 5;
    }
    if (state.lost === 3 || state.wave === beltWaves)
      return Math.max(0, state.points);
  }
  if (state.wave === beltWaves)
    return Math.round((100 * state.caught) / beltWaves);
  state.wave++;
  openWave(state, now, shuffle);
  return null;
}

export function turnInteractiveChallenge(state, body, now, shuffle) {
  return state.interactive === "escape"
    ? turnRoom(state, body)
    : turnBelt(state, body, now, shuffle);
}
