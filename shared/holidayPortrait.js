import { interpolate } from "./languages.js";
import { gameCatalog } from "./gameCatalog.js";
import { holidayCharacters } from "./holidayCharacters.js";
import { computeFestiveProgress } from "./festiveProgress.js";
export { holidayCharacters } from "./holidayCharacters.js";

export const holidayIcons = [
  { id: "tree", emoji: "🎄", label: "Albero di Natale" },
  { id: "gift", emoji: "🎁", label: "Pacchetto regalo" },
  { id: "snow", emoji: "❄️", label: "Fiocco di neve" },
  { id: "reindeer", emoji: "🦌", label: "Renna" },
  { id: "santa", emoji: "🎅", label: "Cappello di Natale" },
  { id: "cookie", emoji: "🍪", label: "Biscotto speziato" },
  { id: "candle", emoji: "🕯️", label: "Candela accesa" },
  { id: "bell", emoji: "🔔", label: "Campanella" },
  { id: "star", emoji: "⭐", label: "Stella cometa" },
  { id: "scarf", emoji: "🧣", label: "Sciarpa calda" },
  { id: "cocoa", emoji: "☕", label: "Cioccolata fumante" },
  { id: "music", emoji: "🎶", label: "Canzoni delle feste" },
  { id: "home", emoji: "🏠", label: "Casa illuminata" },
  { id: "sleigh", emoji: "🛷", label: "Slitta sulla neve" },
  { id: "movie", emoji: "🎬", label: "Film di Natale" },
  { id: "puzzle", emoji: "🧩", label: "Enigma natalizio" },
];

export const holidayIconMap = new Map(
  holidayIcons.map((item) => [item.id, item]),
);

export const holidayActivities = [
  "Sto impacchettando i regali con doppi fiocchi 🎁",
  "Sforno biscotti allo zenzero e cannella 🍪",
  "Sbroglio 25.000 lucine di Natale ✨",
  "Progetto trappole ingegnose alla Mamma ho perso l’aereo 🏠",
  "Fingo di brontolare come il Grinch ma preparo sorprese 🎄",
  "Ascolto classici di Natale a volume festivo 🎶",
  "Cioccolata calda, coperta e maratona di film 🎬",
  "Cerco indizi e timbri nascosti sotto l’albero 🧩",
];

export const holidayPhrases = [
  "Anche il Grinch aveva solo bisogno della compagnia giusta.",
  "Tenete il resto! Io penso a scegliere il regalo perfetto.",
  "Il modo migliore per diffondere lo spirito natalizio è cantare a squarciagola.",
  "Quest’anno le mie lucine si vedono anche dallo spazio.",
  "Un piccolo indizio sotto l’albero vale più di mille parole.",
  "Niente fretta: il bello delle feste è godersi l’attesa.",
];

export const holidayRiddlePresets = [
  {
    id: "candycane",
    title: "Dolce a righe",
    riddle:
      "Sono bianco e rosso, ho la forma di un bastone da passeggio ma finisco sempre nel tè o appeso a un ramo. Chi sono?",
    hint: "Sa di menta zuccherata.",
    answer: "bastoncino di zucchero",
  },
  {
    id: "snowman",
    title: "Ospite in giardino",
    riddle:
      "Ho un naso arancione, una sciarpa al collo e adoro il gelo, ma se esce il sole parto senza salutare. Chi sono?",
    hint: "Mi costruisci con tre sfere bianche.",
    answer: "pupazzo di neve",
  },
  {
    id: "pinecone",
    title: "Tesoro del bosco",
    riddle:
      "Non ho foglie né fiori, ma custodisco i semi dell’abete e divento dorata sui centrotavola delle feste. Chi sono?",
    hint: "Cado dai pini e dagli abeti.",
    answer: "pigna",
  },
  {
    id: "star",
    title: "Guida luminosa",
    riddle:
      "Salgo sempre sulla punta più alta dell’albero e ho una coda brillante che indica il cammino. Chi sono?",
    hint: "Brillo nel cielo di dicembre.",
    answer: "stella cometa",
  },
  {
    id: "stocking",
    title: "Appesa al camino",
    riddle:
      "Di solito cammino dentro una scarpa, ma a Natale resto appesa al camino tutta vuota aspettando dolci e sorprese. Chi sono?",
    hint: "Si riempie nella notte della Befana o di Natale.",
    answer: "calza",
  },
  {
    id: "gingerbread",
    title: "Fuga dal forno",
    riddle:
      "Profumo di cannella e zenzero, ho bottoni di glassa e corro veloce sul vassoio dei biscotti. Chi sono?",
    hint: "Un biscotto a forma di omino.",
    answer: "omino di pan di zenzero",
  },
];

export const tasteAxes = [
  { id: "entusiasmo", label: "Entusiasmo" },
  { id: "ingegno", label: "Ingegno" },
  { id: "tradizione", label: "Tradizione" },
  { id: "ironia", label: "Ironia" },
  { id: "spettacolo", label: "Scenografia" },
];

export const holidayQuestions = [
  {
    id: "sweater",
    title: "Domanda del giorno: Maglione natalizio preferito?",
    shortLabel: "Maglione natalizio",
    options: [
      {
        id: "reindeer_lights",
        label: "Con renna luminosa e campanellini veri",
        weights: { entusiasmo: 24, spettacolo: 22, tradizione: 8 },
        summary: "ama i maglioni con renne luminose e campanellini",
      },
      {
        id: "nordic_classic",
        label: "Intrecci nordici rossi e bianchi da baita",
        weights: { tradizione: 26, entusiasmo: 12, spettacolo: 10 },
        summary:
          "preferisce il calore di un classico maglione nordico da baita",
      },
      {
        id: "grinch_ironic",
        label: "Verde, con una battuta sulle feste",
        weights: { ironia: 28, ingegno: 14, tradizione: 6 },
        summary: "sceglie un maglione verde con una battuta sulle feste",
      },
      {
        id: "kevin_red",
        label: "Rosso e comodo, per muoversi liberamente",
        weights: { ingegno: 26, ironia: 14, tradizione: 12 },
        summary: "sceglie un maglione rosso e comodo",
      },
    ],
  },
  {
    id: "soundtrack",
    title: "Qual è la tua colonna sonora di dicembre?",
    shortLabel: "Colonna sonora",
    options: [
      {
        id: "choir_classics",
        label: "Grandi classici e cori cantati a squarciagola",
        weights: { entusiasmo: 25, spettacolo: 18, tradizione: 14 },
        summary: "canta a memoria i grandi classici delle feste",
      },
      {
        id: "jazz_fireplace",
        label: "Jazz natalizio soffuso davanti al camino",
        weights: { tradizione: 25, spettacolo: 12, ingegno: 10 },
        summary: "si rilassa con jazz natalizio e luci soffuse",
      },
      {
        id: "rock_jingle",
        label: "Ritmi vivaci per ballare mentre si cucina",
        weights: { entusiasmo: 20, ironia: 18, spettacolo: 16 },
        summary: "trasforma i preparativi in una festa musicale",
      },
      {
        id: "snow_silence",
        label: "Il silenzio ovattato della neve fuori dalla finestra",
        weights: { tradizione: 20, ingegno: 18, ironia: 14 },
        summary: "apprezza la quiete magica della neve che cade",
      },
    ],
  },
  {
    id: "treat",
    title: "Merenda o dolce natalizio irrinunciabile?",
    shortLabel: "Dolce delle feste",
    options: [
      {
        id: "gingerbread_cookies",
        label: "Biscotti di pan di zenzero decorati a mano",
        weights: { tradizione: 20, entusiasmo: 18, ingegno: 12 },
        summary: "non resiste ai biscotti di pan di zenzero appena sfornati",
      },
      {
        id: "maple_candy",
        label: "Cioccolata con panna, marshmallow e bastoncini di zucchero",
        weights: { entusiasmo: 26, spettacolo: 16, ironia: 8 },
        summary: "abbonda con cioccolata, marshmallow e bastoncini di zucchero",
      },
      {
        id: "panettone_warm",
        label: "Fetta tradizionale scaldata vicino al camino",
        weights: { tradizione: 26, spettacolo: 12, entusiasmo: 10 },
        summary: "custodisce il rito della fetta tradizionale delle feste",
      },
      {
        id: "spiced_tea",
        label: "Infuso speziato agli agrumi, cannella e chiodi di garofano",
        weights: { ingegno: 18, tradizione: 20, ironia: 12 },
        summary: "ama i profumi d’agrumi, cannella e spezie d’inverno",
      },
    ],
  },
  {
    id: "wrapping",
    title: "Come prepari i tuoi pacchetti regalo?",
    shortLabel: "Stile pacchetti",
    options: [
      {
        id: "wax_vintage",
        label: "Carta kraft, spago, rametto di pino e ceralacca",
        weights: { tradizione: 24, spettacolo: 18, ingegno: 12 },
        summary: "cura i pacchetti con carta antica, pino e ceralacca",
      },
      {
        id: "explosion_gold",
        label: "Carta dorata, triplo fiocco e coccarda gigante",
        weights: { spettacolo: 28, entusiasmo: 20, tradizione: 8 },
        summary: "punta su carta scintillante e fiocchi spettacolari",
      },
      {
        id: "puzzle_box",
        label: "Scatola misteriosa con indovinello da risolvere",
        weights: { ingegno: 28, ironia: 20, entusiasmo: 8 },
        summary: "trasforma anche il pacchetto in un enigma divertente",
      },
      {
        id: "heart_note",
        label: "Incarto essenziale ma con un biglietto scritto col cuore",
        weights: { tradizione: 20, ironia: 16, ingegno: 12 },
        summary: "mette tutto il valore in un biglietto sincero e pensato",
      },
    ],
  },
  {
    id: "movie_night",
    title: "La tua serata di dicembre ideale?",
    shortLabel: "Serata ideale",
    options: [
      {
        id: "marathon_sofa",
        label: "Maratona di classici di Natale sotto il plaid",
        weights: { tradizione: 22, entusiasmo: 16, spettacolo: 14 },
        summary: "adora le maratone dei film di Natale sotto il plaid",
      },
      {
        id: "boardgames_friends",
        label: "Giochi di società, sfide e risate col gruppo",
        weights: { ingegno: 24, entusiasmo: 18, ironia: 14 },
        summary: "accende le serate con giochi, sfide e indovinelli",
      },
      {
        id: "lights_tour",
        label: "A caccia delle case e piazze più illuminate",
        weights: { spettacolo: 26, entusiasmo: 20, tradizione: 10 },
        summary: "va a caccia delle luminarie più spettacolari",
      },
      {
        id: "creative_twist",
        label: "Inventare decorazioni o sorprese fuori dagli schemi",
        weights: { ironia: 24, ingegno: 22, spettacolo: 12 },
        summary: "ama dare un tocco creativo e insolito alle feste",
      },
    ],
  },
  {
    id: "tree_style",
    title: "Come addobbi l’albero di Natale?",
    shortLabel: "Stile dell’albero",
    options: [
      {
        id: "classic_gold_red",
        label: "Oro e rosso classico con palline di famiglia",
        weights: { tradizione: 25, spettacolo: 16, entusiasmo: 12 },
        summary:
          "decora l’albero in oro e rosso classico con ricordi di famiglia",
      },
      {
        id: "colorful_fun",
        label: "Lucine colorate, festoni allegri e addobbi buffi",
        weights: { entusiasmo: 24, spettacolo: 24, ironia: 10 },
        summary: "riempie l’albero di luci vivaci e addobbi allegri",
      },
      {
        id: "nordic_wood",
        label: "Legno naturale, pigne, spago e luci calde soffuse",
        weights: { tradizione: 22, ingegno: 16, spettacolo: 10 },
        summary: "sceglie addobbi naturali in legno, pigne e luci calde",
      },
      {
        id: "thematic_original",
        label: "Un albero a tema originale e pieno di citazioni",
        weights: { ironia: 22, ingegno: 24, spettacolo: 16 },
        summary: "trasforma l’albero in un progetto tematico originale",
      },
    ],
  },
  {
    id: "gift_mission",
    title: "Da cosa parti quando scegli un regalo?",
    shortLabel: "Superpotere regali",
    options: [
      {
        id: "detail_hunter",
        label: "Cogliere il piccolo dettaglio che nessuno aveva notato",
        weights: { ingegno: 24, tradizione: 16, entusiasmo: 10 },
        summary: "coglie sempre il piccolo dettaglio nascosto nei desideri",
      },
      {
        id: "treasure_hunt",
        label: "Creare un biglietto-enigma o una caccia per aprire il pacco",
        weights: { ingegno: 26, ironia: 18, spettacolo: 12 },
        summary:
          "trasforma l’apertura del regalo in una piccola caccia al tesoro",
      },
      {
        id: "group_cheer",
        label: "Portare buonumore e far sorridere tutto il gruppo",
        weights: { entusiasmo: 26, ironia: 14, spettacolo: 14 },
        summary: "porta buonumore e sorrisi in ogni scambio",
      },
      {
        id: "thoughtful_practical",
        label: "Scegliere qualcosa di utile, autentico e duraturo",
        weights: { tradizione: 26, ingegno: 14, ironia: 8 },
        summary: "punta su pensieri autentici, utili e scelti con cura",
      },
    ],
  },
];

// Explicitly chosen moods describe the current state, not a psychological trait.
export const holidayMoods = [
  {
    id: "buddy",
    label: "Buddy",
    emoji: "🧝",
    description: "Pieno di entusiasmo",
    weights: {
      entusiasmo: 98,
      ingegno: 55,
      tradizione: 76,
      ironia: 52,
      spettacolo: 86,
    },
  },
  {
    id: "grinch",
    label: "Il Grinch",
    emoji: "💚",
    description: "Con un po’ di ironia",
    weights: {
      entusiasmo: 38,
      ingegno: 74,
      tradizione: 45,
      ironia: 95,
      spettacolo: 52,
    },
  },
  {
    id: "kevin",
    label: "Kevin",
    emoji: "🏠",
    description: "Pronto a inventare un piano",
    weights: {
      entusiasmo: 68,
      ingegno: 96,
      tradizione: 62,
      ironia: 78,
      spettacolo: 66,
    },
  },
  {
    id: "cocoa",
    label: "Una cioccolata calda",
    emoji: "☕",
    description: "In cerca di calma e calore",
    weights: {
      entusiasmo: 48,
      ingegno: 60,
      tradizione: 96,
      ironia: 45,
      spettacolo: 40,
    },
  },
  {
    id: "star",
    label: "Una stella",
    emoji: "⭐",
    description: "Con la voglia di brillare",
    weights: {
      entusiasmo: 90,
      ingegno: 52,
      tradizione: 72,
      ironia: 48,
      spettacolo: 98,
    },
  },
  {
    id: "gift",
    label: "Un regalo",
    emoji: "🎁",
    description: "Con una sorpresa da condividere",
    weights: {
      entusiasmo: 64,
      ingegno: 80,
      tradizione: 88,
      ironia: 42,
      spettacolo: 62,
    },
  },
  {
    id: "snow",
    label: "Un fiocco di neve",
    emoji: "❄️",
    description: "Tranquillo e un po’ sognante",
    weights: {
      entusiasmo: 45,
      ingegno: 85,
      tradizione: 64,
      ironia: 50,
      spettacolo: 66,
    },
  },
  {
    id: "sleigh",
    label: "Una slitta",
    emoji: "🛷",
    description: "Con la voglia di partire",
    weights: {
      entusiasmo: 92,
      ingegno: 65,
      tradizione: 65,
      ironia: 75,
      spettacolo: 82,
    },
  },
];

const romeDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function romeToday(now = Date.now()) {
  return romeDayFormatter.format(now);
}

export function getDailyQuestion(today = romeToday(), answers = {}) {
  const parts = String(today).split("-").map(Number);
  const seed =
    parts.length === 3 && parts.every(Number.isFinite)
      ? parts[0] * 372 + parts[1] * 31 + parts[2]
      : 0;
  const dailyIndex = Math.abs(seed) % holidayQuestions.length;
  const featured = holidayQuestions[dailyIndex] || holidayQuestions[0];
  const ordered = [
    featured,
    ...holidayQuestions.filter((q) => q.id !== featured.id),
  ];
  const firstUnanswered = ordered.find((q) => !answers?.[q.id]) || featured;
  return {
    featured,
    ordered,
    suggested: firstUnanswered,
  };
}

function cleanDateList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  for (const item of list) {
    if (typeof item === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item)) {
      seen.add(item);
    }
  }
  return [...seen].sort().slice(-60);
}

export function parseHolidayProfile(raw) {
  let parsed = {};
  if (raw && typeof raw === "string") {
    try {
      const value = JSON.parse(raw);
      parsed =
        value && typeof value === "object" && !Array.isArray(value)
          ? value
          : {};
    } catch {
      parsed = {};
    }
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    parsed = raw;
  }
  const answers = {};
  if (parsed.answers && typeof parsed.answers === "object") {
    for (const q of holidayQuestions) {
      const val = parsed.answers[q.id];
      if (q.options.some((opt) => opt.id === val)) {
        answers[q.id] = val;
      }
    }
  }
  const iconMessage = Array.isArray(parsed.iconMessage)
    ? parsed.iconMessage
        .filter((id) => typeof id === "string" && holidayIconMap.has(id))
        .slice(0, 6)
    : [];
  const lastPromptDate =
    typeof parsed.lastPromptDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastPromptDate)
      ? parsed.lastPromptDate
      : null;
  const lastPromptStatus =
    parsed.lastPromptStatus === "completed" ||
    parsed.lastPromptStatus === "skipped"
      ? parsed.lastPromptStatus
      : null;
  return {
    quote: typeof parsed.quote === "string" ? parsed.quote.slice(0, 160) : "",
    activity:
      typeof parsed.activity === "string" ? parsed.activity.slice(0, 120) : "",
    ...(typeof parsed.activity === "string" &&
    parsed.activity.trim() &&
    holidayActivities.includes(parsed.activityPreset)
      ? { activityPreset: parsed.activityPreset }
      : {}),
    iconMessage,
    iconCaption:
      typeof parsed.iconCaption === "string"
        ? parsed.iconCaption.slice(0, 120)
        : "",
    riddle:
      typeof parsed.riddle === "string" ? parsed.riddle.slice(0, 240) : "",
    riddleHint:
      typeof parsed.riddleHint === "string"
        ? parsed.riddleHint.slice(0, 160)
        : "",
    riddleAnswer:
      typeof parsed.riddleAnswer === "string"
        ? parsed.riddleAnswer.slice(0, 120)
        : "",
    answers,
    customDescription:
      typeof parsed.customDescription === "string"
        ? parsed.customDescription.slice(0, 1200)
        : "",
    portraitApproved:
      typeof parsed.portraitApproved === "boolean"
        ? parsed.portraitApproved
        : true,
    dailyMood:
      holidayMoods.some((mood) => mood.id === parsed.dailyMood?.id) &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.dailyMood?.date || "")
        ? { id: parsed.dailyMood.id, date: parsed.dailyMood.date }
        : null,
    lastPromptDate,
    lastPromptStatus,
    skippedDates: cleanDateList(parsed.skippedDates),
    completedDates: cleanDateList(parsed.completedDates),
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
  };
}

export function normalizeRiddleText(value) {
  return String(value || "")
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(il|lo|la|i|gli|le|un|uno|una|l)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkRiddleGuess(guess, expected) {
  const cleanGuess = normalizeRiddleText(guess);
  const cleanExpected = normalizeRiddleText(expected);
  if (!cleanGuess || !cleanExpected) return false;
  return (
    cleanGuess === cleanExpected ||
    (cleanExpected.length >= 4 && cleanGuess.includes(cleanExpected)) ||
    (cleanGuess.length >= 4 && cleanExpected.includes(cleanGuess))
  );
}

// These playful mappings describe game styles, never the content of factual answers.
const gameTraits = {
  quiz: [65, 96, 62, 76, 60],
  memory: [44, 85, 84, 55, 42],
  film: [76, 72, 48, 80, 88],
  pacchi: [52, 84, 88, 38, 58],
  slitta: [92, 65, 65, 75, 82],
  cartolina: [48, 90, 62, 52, 68],
  addobbi: [88, 52, 86, 62, 98],
  tris: [62, 98, 52, 78, 48],
  duel: [65, 96, 62, 76, 60],
  curling: [76, 86, 60, 68, 72],
};
const traitVector = (values) =>
  Object.fromEntries(tasteAxes.map(({ id }, index) => [id, values[index]]));
const bounded = (value, max) => Math.max(0, Math.min(max, Number(value) || 0));
const averageTraits = (entries) => {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  return total
    ? Object.fromEntries(
        tasteAxes.map(({ id }) => [
          id,
          entries.reduce(
            (sum, entry) => sum + (entry.traits[id] ?? 50) * entry.weight,
            0,
          ) / total,
        ]),
      )
    : null;
};

export function formatPortraitDescription(parts, translate = interpolate) {
  return parts
    .map(({ key, values }) => {
      const localized = { ...values };
      for (const field of ["level", "mood", "preference"]) {
        if (localized[field]) localized[field] = translate(localized[field]);
      }
      return translate(key, localized);
    })
    .join(" ");
}

export function formatPortraitSignals(parts, translate = interpolate) {
  return parts.map(({ key, values }) => {
    const localized = { ...values };
    for (const field of [
      "game",
      "label",
      "mood",
      "preset",
      "question",
      "option",
    ]) {
      if (localized[field]) localized[field] = translate(localized[field]);
    }
    if (Array.isArray(localized.icons)) {
      localized.icons = localized.icons
        .map((icon) => translate(icon))
        .join(", ");
    }
    return translate(key, localized);
  });
}

export function computeHolidayPortrait(rawProfile, context = {}) {
  const profile = parseHolidayProfile(rawProfile);
  const displayName =
    String(context.nickname || context.name || "Partecipante").trim() ||
    "Partecipante";
  const today = context.today || romeToday();
  const privateSignalParts = [];
  const addSignal = (key, values = {}) =>
    privateSignalParts.push({ key, values });
  const activityEntries = [];
  const games = Array.isArray(context.activity?.games)
    ? context.activity.games
    : [];
  for (const game of games) {
    const count = bounded(game.count, 3);
    if (!count || !gameTraits[game.game]) continue;
    const traits = traitVector(gameTraits[game.game]);
    // A normalized result adds at most five points to the game-style axis.
    // Wrong factual answers do not imply taste or dislike.
    if (
      typeof game.averageResult === "number" &&
      Number.isFinite(game.averageResult)
    ) {
      traits.ingegno = Math.min(
        100,
        traits.ingegno + bounded(game.averageResult, 1) * 5,
      );
    }
    activityEntries.push({ traits, weight: count });
    const label =
      game.game === "curling"
        ? "Curling dei regali"
        : gameCatalog.find((item) => item.id === game.game)?.name ||
          "Duello quiz";
    const values = {
      game: label,
      count: Math.max(0, Math.floor(Number(game.count) || 0)),
    };
    if (game.game === "curling") {
      addSignal(
        "{game} · Partite completate: {count} (massimo 3 nel calcolo). Il dispositivo registra la partecipazione senza verificare il punteggio.",
        values,
      );
    } else if (Number.isFinite(game.averageResult)) {
      addSignal(
        "{game} · Partite completate: {count} (massimo 3 nel calcolo). Risultato medio: {result}% del massimo.",
        {
          ...values,
          result: Math.round(bounded(game.averageResult, 1) * 100),
        },
      );
    } else {
      addSignal(
        "{game} · Partite completate: {count} (massimo 3 nel calcolo).",
        values,
      );
    }
  }
  const stampsCount = bounded(
    context.activity?.stampsCount ?? context.stampsCount,
    12,
  );
  const interactionsCount = bounded(context.activity?.interactionsCount, 5);
  if (stampsCount) {
    activityEntries.push({
      traits: traitVector([84, 78, 58, 48, 74]),
      weight: stampsCount / 6,
    });
    addSignal("Timbri raccolti: {count} (massimo 12 nel calcolo).", {
      count: stampsCount,
    });
  }
  if (interactionsCount) {
    activityEntries.push({
      traits: traitVector([80, 60, 94, 48, 56]),
      weight: interactionsCount / 5,
    });
    addSignal(
      "Interazioni inviate al gruppo: {count} (massimo 5 nel calcolo).",
      { count: interactionsCount },
    );
  }
  // Saved tool use is a small, saturated participation signal. We use counts
  // only: no interpretation of wish titles, answers, messages or event details.
  const toolSignals = [
    ["wishlistItemsCount", 5, [62, 72, 90, 48, 58], "desideri salvati", 0.25],
    [
      "organizedEventsCount",
      3,
      [72, 84, 78, 48, 72],
      "eventi organizzati",
      0.25,
    ],
  ];
  for (const [key, cap, values, label, maxWeight] of toolSignals) {
    const count = bounded(context.activity?.tools?.[key], cap);
    if (!count) continue;
    activityEntries.push({
      traits: traitVector(values),
      weight: (count / cap) * maxWeight,
    });
    addSignal(
      "Conteggio per «{label}»: {count} (massimo {cap}). Si considera solo la partecipazione, senza leggere i contenuti.",
      { count, cap, label },
    );
  }
  // Legacy callers can still supply a completed-game count, without inventing a game type.
  if (!games.length && bounded(context.gamesPlayed, 3)) {
    activityEntries.push({
      traits: traitVector([70, 80, 65, 65, 60]),
      weight: bounded(context.gamesPlayed, 3),
    });
    addSignal("Partite completate: tipo non disponibile nei dati precedenti.");
  }

  const expressedEntries = [];
  const mood = holidayMoods.find((item) => item.id === profile.dailyMood?.id);
  if (mood) {
    expressedEntries.push({ traits: mood.weights, weight: 3 });
    addSignal("Stato scelto: {mood} ({date}).", {
      mood: mood.label,
      date: profile.dailyMood.date,
    });
  }
  const iconTraits = {
    puzzle: [55, 95, 52, 70, 52],
    home: [62, 65, 92, 45, 58],
    cookie: [76, 52, 92, 48, 62],
    cocoa: [48, 60, 96, 45, 40],
    star: [90, 52, 72, 48, 98],
    santa: [90, 50, 82, 52, 78],
    gift: [64, 80, 88, 42, 62],
    movie: [76, 72, 48, 80, 88],
    music: [82, 45, 78, 58, 82],
    snow: [45, 85, 64, 50, 66],
    tree: [80, 52, 90, 45, 90],
    sleigh: [92, 65, 65, 75, 82],
    bell: [82, 45, 82, 58, 76],
    scarf: [48, 60, 92, 45, 42],
    candle: [52, 58, 96, 42, 62],
    reindeer: [88, 62, 78, 65, 74],
  };
  for (const icon of new Set(profile.iconMessage)) {
    if (iconTraits[icon])
      expressedEntries.push({
        traits: traitVector(iconTraits[icon]),
        weight: 0.5,
      });
  }
  if (profile.iconMessage.length)
    addSignal("Icone scelte: {icons}.", {
      icons: profile.iconMessage.map((id) => holidayIconMap.get(id).label),
    });
  // Recognize only the app's explicit status presets; do not interpret arbitrary prose as personality.
  const activityIndex = holidayActivities.indexOf(
    profile.activityPreset || profile.activity,
  );
  const presetTraits = [
    [64, 80, 88, 42, 62],
    [76, 52, 92, 48, 62],
    [88, 52, 86, 62, 98],
    [68, 96, 62, 78, 66],
    [38, 74, 45, 95, 52],
    [82, 45, 78, 58, 82],
    [48, 60, 96, 45, 40],
    [65, 96, 62, 76, 60],
  ];
  if (activityIndex >= 0) {
    expressedEntries.push({
      traits: traitVector(presetTraits[activityIndex]),
      weight: 1,
    });
    // Legacy profiles can contain the original Italian preset without an id.
    addSignal("Attività dichiarata: {preset}.", {
      preset: holidayActivities[activityIndex],
    });
  }

  const chosen = holidayQuestions.flatMap((question) => {
    const option = question.options.find(
      (item) => item.id === profile.answers[question.id],
    );
    return option ? [{ question, option }] : [];
  });
  const questionEntries = chosen.map(({ question, option }) => {
    addSignal("{question}: {option}.", {
      question: question.shortLabel,
      option: option.label,
    });
    const max = Math.max(...Object.values(option.weights));
    return {
      traits: Object.fromEntries(
        tasteAxes.map(({ id }) => [
          id,
          35 + ((option.weights[id] || 0) / max) * 60,
        ]),
      ),
      weight: 1,
    };
  });
  const buckets = [
    {
      id: "activity",
      label: "Attività reale",
      baseWeight: 60,
      traits: averageTraits(activityEntries),
    },
    {
      id: "expressed",
      label: "Stato e gusti espressi",
      baseWeight: 25,
      traits: averageTraits(expressedEntries),
    },
    {
      id: "questions",
      label: "Domande facoltative",
      baseWeight: 15,
      traits: averageTraits(questionEntries),
    },
  ];
  const availableWeight = buckets.reduce(
    (sum, bucket) => sum + (bucket.traits ? bucket.baseWeight : 0),
    0,
  );
  const weights = buckets.map(({ id, label, baseWeight, traits }) => ({
    id,
    label,
    baseWeight,
    available: Boolean(traits),
    effectiveWeight: traits
      ? Math.floor((baseWeight / availableWeight) * 100)
      : 0,
  }));
  if (availableWeight) {
    const ranked = weights
      .filter((weight) => weight.available)
      .slice()
      .sort(
        (a, b) =>
          (b.baseWeight / availableWeight) * 100 -
          b.effectiveWeight -
          ((a.baseWeight / availableWeight) * 100 - a.effectiveWeight),
      );
    const remainder =
      100 - weights.reduce((sum, weight) => sum + weight.effectiveWeight, 0);
    for (let index = 0; index < remainder; index++)
      ranked[index].effectiveWeight++;
  }
  const combined =
    averageTraits(
      buckets
        .filter((bucket) => bucket.traits)
        .map((bucket) => ({
          traits: bucket.traits,
          weight: bucket.baseWeight,
        })),
    ) || traitVector([50, 50, 50, 50, 50]);
  const tastes = tasteAxes.map(({ id, label }) => ({
    id,
    label,
    value: Math.round(combined[id]),
  }));
  const festiveProgress = computeFestiveProgress(
    {
      ...context.activity,
      stampsCount: context.activity?.stampsCount ?? context.stampsCount,
    },
    profile,
  );
  const characterMatches = holidayCharacters
    .map((character) => {
      const distance = Math.sqrt(
        tasteAxes.reduce(
          (sum, { id }) =>
            sum + ((combined[id] - character.profile[id]) / 100) ** 2,
          0,
        ) / tasteAxes.length,
      );
      const personalSimilarity = (1 - distance) * 100;
      const stageSimilarity =
        100 - Math.abs(festiveProgress.score - character.festiveReadiness);
      return {
        ...character,
        affinity: Math.round(
          Math.max(
            0,
            Math.min(100, personalSimilarity * 0.65 + stageSimilarity * 0.35),
          ),
        ),
      };
    })
    .sort((a, b) => b.affinity - a.affinity || a.id.localeCompare(b.id))
    .slice(0, 3);
  const topCharacter = characterMatches[0];
  const evidenceCount =
    activityEntries.length + expressedEntries.length + questionEntries.length;
  const provisional = evidenceCount < 2;
  const matchingExplanation = {
    weights,
    signals: formatPortraitSignals(privateSignalParts),
    festiveProgress,
    components: [
      { id: "personal", label: "Somiglianza dei tratti", weight: 65 },
      { id: "festive", label: "Coinvolgimento natalizio", weight: 35 },
    ],
    method:
      "Affinità = 65% somiglianza dei cinque tratti + 35% vicinanza fra coinvolgimento e fase natalizia del personaggio. I tratti usano la media delle fonti disponibili; il coinvolgimento cresce con attività diverse e conserva il massimo raggiunto. L’iscrizione da sola non conta. Senza attività il confronto parte dai personaggi scettici: non significa che tu lo sia. Ogni percentuale è indipendente, non è una probabilità né una valutazione psicologica. Le ripetizioni di ogni gioco contano al massimo tre volte; i quiz indicano attività e conoscenze, non gusti personali.",
    provisional,
  };
  // Keep user-supplied display names separate from authored phrases so each
  // viewer can read the generated portrait without translating private text.
  const descriptionParts = [];
  const addDescription = (key, values = {}) =>
    descriptionParts.push({ key, values });
  if (!availableWeight && festiveProgress.score > 0) {
    addDescription(
      "Il coinvolgimento conserva il livello “{level}” già raggiunto.",
      { level: festiveProgress.level.label },
    );
    addDescription(
      "Il confronto usa tratti neutri e la partecipazione registrata in precedenza; le domande restano facoltative.",
    );
  } else if (!availableWeight) {
    addDescription(
      "Questo è un ritratto provvisorio: il percorso parte dai personaggi scettici del Natale, senza attribuirti il loro carattere.",
    );
    addDescription(
      "I tratti restano neutri; il coinvolgimento cresce con giochi, timbri e attività salvate, anche senza domande.",
    );
  } else {
    if (activityEntries.length) {
      if (mood)
        addDescription(
          "{name} ha già partecipato alle attività e ha scelto “{mood}” come ultimo stato.",
          { name: displayName, mood: mood.label },
        );
      else
        addDescription("{name} ha già partecipato alle attività.", {
          name: displayName,
        });
    } else if (mood) {
      addDescription("{name} ha scelto di sentirsi come {mood}.", {
        name: displayName,
        mood: mood.label,
      });
    } else if (chosen.length) {
      addDescription("Durante le feste {name} {preference}.", {
        name: displayName,
        preference: chosen[0].option.summary,
      });
    } else {
      addDescription(
        "Il ritratto di {name} parte dalle icone e dalle attività scelte nel profilo.",
        { name: displayName },
      );
    }
    addDescription(
      provisional
        ? "Al momento il ritratto ricorda soprattutto {character}: è ancora un primo confronto."
        : "Al momento il ritratto ricorda soprattutto {character}.",
      { character: topCharacter.name },
    );
  }
  const generatedDescription = formatPortraitDescription(descriptionParts);
  const completeness = evidenceCount
    ? Math.min(100, Math.round(35 + evidenceCount * 12))
    : 0;
  return {
    profile,
    completeness,
    answeredCount: chosen.length,
    totalQuestions: holidayQuestions.length,
    confidenceLevel:
      evidenceCount >= 5 ? "alta" : evidenceCount >= 2 ? "media" : "bassa",
    confidencePct: completeness,
    skippedCount: profile.skippedDates.length,
    completedCount: profile.completedDates.length,
    ignoredToday:
      profile.lastPromptDate === today &&
      profile.lastPromptStatus === "skipped",
    tastes,
    characterMatches,
    topCharacter,
    matchingExplanation,
    privateSignalParts,
    festiveProgress,
    descriptionParts,
    generatedDescription,
    finalDescription: profile.customDescription.trim() || generatedDescription,
    spiritScene: {
      characterId: topCharacter.id,
      sweater: profile.answers.sweater || "nordic_classic",
      soundtrack: profile.answers.soundtrack || "jazz_fireplace",
      treat: profile.answers.treat || "gingerbread_cookies",
      wrapping: profile.answers.wrapping || "wax_vintage",
      icons: profile.iconMessage.length
        ? profile.iconMessage.map((id) => holidayIconMap.get(id)?.emoji || "🎄")
        : ["🎄", "⭐", "🎁"],
    },
  };
}
