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
  { id: "entusiasmo", label: "Entusiasmo & Meraviglia" },
  { id: "ingegno", label: "Ingegno & Indovinelli" },
  { id: "tradizione", label: "Calore & Tradizione" },
  { id: "ironia", label: "Spirito Frizzante & Ironia" },
  { id: "spettacolo", label: "Scenografia & Lucine" },
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
        summary: "preferisce il calore di un classico maglione nordico da baita",
      },
      {
        id: "grinch_ironic",
        label: "Verde Grinch con battuta ironica sulle feste",
        weights: { ironia: 28, ingegno: 14, tradizione: 6 },
        summary: "sfoggia con ironia un maglione stile Grinch",
      },
      {
        id: "kevin_red",
        label: "Maglione rosso da stratega alla Mamma ho perso l’aereo",
        weights: { ingegno: 26, ironia: 14, tradizione: 12 },
        summary: "sceglie il maglione rosso da piccolo grande stratega di casa",
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
        summary: "decora l’albero in oro e rosso classico con ricordi di famiglia",
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
    title: "Qual è il tuo superpotere segreto nello scambio regali?",
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
        summary: "trasforma l’apertura del regalo in una piccola caccia al tesoro",
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

export const holidayCharacters = [
  {
    id: "grinch",
    name: "Il Grinch",
    movie: "Il Grinch",
    image: "/characters/grinch.webp",
    tagline: "Ironico fuori, cuore che cresce di tre taglie dentro",
    description:
      "Finge di avere un’allergia alle smancerie, ma osserva tutto con arguzia e al momento giusto sa sorprendere il gruppo con i gesti più sinceri.",
    profile: {
      entusiasmo: 38,
      ingegno: 74,
      tradizione: 45,
      ironia: 95,
      spettacolo: 52,
    },
  },
  {
    id: "kevin",
    name: "Kevin McCallister",
    movie: "Mamma, ho perso l’aereo",
    image: "/characters/kevin.webp",
    tagline: "Mente brillante, piani ingegnosi e spirito d’avventura",
    description:
      "Ama gli indovinelli, le sfide di astuzia e i dettagli ben congegnati: trasforma ogni preparativo natalizio in una piccola missione creativa.",
    profile: {
      entusiasmo: 68,
      ingegno: 96,
      tradizione: 62,
      ironia: 78,
      spettacolo: 66,
    },
  },
  {
    id: "scrooge",
    name: "Ebenezer Scrooge",
    movie: "Canto di Natale",
    image: "/characters/scrooge.webp",
    tagline: "Riflessivo, autentico e capace di grandi sorprese",
    description:
      "Bada alla sostanza più che ai lustrini: apprezza la quiete, le tradizioni vere e i regali scelti con cura e significato profondo.",
    profile: {
      entusiasmo: 44,
      ingegno: 72,
      tradizione: 92,
      ironia: 64,
      spettacolo: 40,
    },
  },
  {
    id: "buddy",
    name: "Buddy l’Elfo",
    movie: "Elf - Un elfo di nome Buddy",
    image: "/characters/buddy.webp",
    tagline: "Pura meraviglia, entusiasmo contagioso e dolcezza",
    description:
      "Vive dicembre con gli occhi pieni di stupore: tra canzoni, dolci e sorrisi, porta subito allegria attorno all’albero.",
    profile: {
      entusiasmo: 98,
      ingegno: 55,
      tradizione: 76,
      ironia: 52,
      spettacolo: 86,
    },
  },
  {
    id: "jack",
    name: "Jack Skeletron",
    movie: "Nightmare Before Christmas",
    image: "/characters/jack.webp",
    tagline: "Curioso, teatrale e amante delle feste fuori dagli schemi",
    description:
      "Unisce fantasia, mistero e creatività: gli piace esplorare il Natale da una prospettiva originale e sorprendere con idee inattese.",
    profile: {
      entusiasmo: 74,
      ingegno: 84,
      tradizione: 42,
      ironia: 88,
      spettacolo: 82,
    },
  },
  {
    id: "clark",
    name: "Clark Griswold",
    movie: "Un Natale esplosivo",
    image: "/characters/clark.webp",
    tagline: "Grande regista delle feste e maestro delle 25.000 lucine",
    description:
      "Sogna un Natale memorabile per tutta la compagnia: cura l’atmosfera, accende mille lucine e tiene insieme il calore delle tradizioni.",
    profile: {
      entusiasmo: 88,
      ingegno: 52,
      tradizione: 86,
      ironia: 62,
      spettacolo: 98,
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
      parsed = JSON.parse(raw);
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

export function computeHolidayPortrait(rawProfile, context = {}) {
  const profile = parseHolidayProfile(rawProfile);
  const displayName =
    String(context.nickname || context.name || "Partecipante").trim() ||
    "Partecipante";
  const today = context.today || romeToday();
  const skippedCount = profile.skippedDates.length;
  const completedCount = profile.completedDates.length;
  const ignoredToday =
    profile.lastPromptDate === today && profile.lastPromptStatus === "skipped";

  const answeredCount = holidayQuestions.filter((q) =>
    Boolean(profile.answers[q.id]),
  ).length;
  const hasActivity = Boolean(profile.activity.trim());
  const hasQuote = Boolean(profile.quote.trim());
  const hasIcons = profile.iconMessage.length > 0;
  const hasRiddle = Boolean(profile.riddle.trim());
  const stampsCount = Number(context.stampsCount) || 0;
  const gamesPlayed = Number(context.gamesPlayed) || 0;

  // Compute completeness (0..100) so ignoring/skipping measurably impacts profile & associations
  const questionWeight = Math.round((answeredCount / holidayQuestions.length) * 56);
  const extrasWeight =
    (hasActivity ? 9 : 0) +
    (hasQuote ? 8 : 0) +
    (hasIcons ? 9 : 0) +
    (hasRiddle ? 10 : 0) +
    (stampsCount > 0 || gamesPlayed > 0 ? 8 : 0);
  const completeness = Math.max(0, Math.min(100, questionWeight + extrasWeight));
  const confidenceLevel =
    completeness >= 65 ? "alta" : completeness >= 30 ? "media" : "bassa";

  const hasRichInput =
    answeredCount > 0 ||
    hasActivity ||
    hasIcons ||
    hasRiddle ||
    stampsCount > 0 ||
    gamesPlayed > 0;

  // Baseline starts reserved/mysterious when user skipped or left profile empty
  const scores = hasRichInput
    ? {
        entusiasmo: 36,
        ingegno: 38,
        tradizione: 40,
        ironia: 34 + Math.min(10, skippedCount * 3),
        spettacolo: 34,
      }
    : {
        entusiasmo: 26,
        ingegno: 34,
        tradizione: 36,
        ironia: 48 + Math.min(18, skippedCount * 6),
        spettacolo: 24,
      };

  const chosenSummaries = [];
  for (const question of holidayQuestions) {
    const selectedId = profile.answers[question.id];
    const option = question.options.find((item) => item.id === selectedId);
    if (option) {
      chosenSummaries.push(option.summary);
      for (const [axis, delta] of Object.entries(option.weights)) {
        scores[axis] = (scores[axis] || 0) + delta * 0.72;
      }
    }
  }

  // Contributions from badge, riddle, activity, icons, stamps and games
  if (hasRiddle) {
    scores.ingegno += 16;
    scores.ironia += 8;
  }
  if (hasActivity) {
    scores.entusiasmo += 8;
    if (/grinch|scherz/i.test(profile.activity)) scores.ironia += 15;
    if (/trappol|indizi|mamma/i.test(profile.activity)) scores.ingegno += 14;
    if (/lucin|25\.000/i.test(profile.activity)) scores.spettacolo += 15;
    if (/biscott|cioccolat|pacchett/i.test(profile.activity))
      scores.tradizione += 12;
  }
  if (hasIcons) {
    scores.spettacolo += profile.iconMessage.length * 2;
    if (profile.iconMessage.includes("puzzle")) scores.ingegno += 10;
    if (
      profile.iconMessage.includes("cookie") ||
      profile.iconMessage.includes("cocoa")
    )
      scores.tradizione += 8;
    if (
      profile.iconMessage.includes("star") ||
      profile.iconMessage.includes("santa")
    )
      scores.entusiasmo += 8;
  }
  if (context.badge) {
    if (["starlight", "bells", "lantern"].includes(context.badge))
      scores.spettacolo += 10;
    if (["waxseal", "holly", "gingerbread"].includes(context.badge))
      scores.tradizione += 10;
    if (["candycane", "velvet", "reindeer"].includes(context.badge))
      scores.entusiasmo += 10;
    if (context.badge === "frost") scores.ingegno += 8;
  }
  if (stampsCount > 0) {
    scores.ingegno += Math.min(20, stampsCount * 3);
    scores.entusiasmo += Math.min(14, stampsCount * 2);
  }
  if (gamesPlayed > 0) {
    scores.ingegno += Math.min(22, gamesPlayed * 4);
    scores.ironia += Math.min(12, gamesPlayed * 2);
  }

  const tastes = tasteAxes.map(({ id, label }) => ({
    id,
    label,
    value: Math.max(18, Math.min(99, Math.round(scores[id]))),
  }));
  const tasteById = Object.fromEntries(tastes.map((t) => [t.id, t.value]));

  // When completeness is low (e.g. user ignored prompts), cap match affinity so uncertainty is visible
  const confidenceScale = 0.56 + (completeness / 100) * 0.44;
  const maxAffinity = Math.round(58 + (completeness / 100) * 40);

  const characterMatches = holidayCharacters
    .map((character) => {
      let squaredDiff = 0;
      for (const { id } of tasteAxes) {
        const diff = (tasteById[id] || 50) - (character.profile[id] || 50);
        squaredDiff += diff * diff;
      }
      const distance = Math.sqrt(squaredDiff / tasteAxes.length);
      const rawAffinity = Math.max(
        25,
        Math.min(98, Math.round(100 - distance * 0.82)),
      );
      const affinity = Math.max(
        22,
        Math.min(maxAffinity, Math.round(rawAffinity * confidenceScale)),
      );
      return {
        ...character,
        affinity,
      };
    })
    .sort((a, b) => b.affinity - a.affinity);

  const topCharacter = characterMatches[0];
  const secondCharacter = characterMatches[1];

  const parts = [];
  if (completeness < 20) {
    parts.push(
      `${displayName} ha scelto per ora di restare un piccolo mistero sotto l’albero${
        skippedCount > 0
          ? ` (ha ignorato ${skippedCount === 1 ? "il check-in di oggi" : `${skippedCount} check-in giornalieri`})`
          : ""
      }.`,
    );
    parts.push(
      `Con così pochi indizi ricorda lo spirito riservato di ${topCharacter.name} (${topCharacter.affinity}% · stima indicativa): rispondendo alle domande guidate o giocando col gruppo il ritratto diventerà molto più preciso!`,
    );
  } else {
    if (chosenSummaries.length >= 2) {
      parts.push(
        `Durante le feste ${displayName} ${chosenSummaries[0]} e ${chosenSummaries[1]}.`,
      );
    } else if (chosenSummaries.length === 1) {
      parts.push(`Durante le feste ${displayName} ${chosenSummaries[0]}.`);
    } else {
      parts.push(
        `${displayName} vive l’attesa del Natale tra curiosità, piccoli indizi e spirito di gioco nel gruppo.`,
      );
    }
    if (chosenSummaries.length >= 3) {
      parts.push(`Inoltre ${chosenSummaries.slice(2, 4).join(" e ")}.`);
    }
    if (hasActivity) {
      parts.push(`In questo momento: “${profile.activity}”.`);
    }
    if (stampsCount > 0 || gamesPlayed > 0) {
      parts.push(
        `Tra caccia ai timbri e sfide natalizie ha già messo alla prova il suo spirito di gioco nel gruppo.`,
      );
    }
    if (ignoredToday) {
      parts.push(
        `Oggi ha preferito saltare l’aggiornamento guidato, lasciando un velo di mistero natalizio.`,
      );
    }
    parts.push(
      `Nei film delle feste si avvicina soprattutto a ${topCharacter.name} (${topCharacter.affinity}%), con un pizzico di ${secondCharacter.name} (${secondCharacter.affinity}%).`,
    );
  }

  const generatedDescription = parts.join(" ");
  const finalDescription =
    profile.customDescription.trim() || generatedDescription;

  return {
    profile,
    completeness,
    answeredCount,
    totalQuestions: holidayQuestions.length,
    confidenceLevel,
    confidencePct: Math.min(98, Math.round(28 + completeness * 0.7)),
    skippedCount,
    completedCount,
    ignoredToday,
    tastes,
    characterMatches,
    topCharacter,
    generatedDescription,
    finalDescription,
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
