export const holidayBadges = [
  {
    id: "holly",
    name: "Agrifoglio dorato",
    subtitle: "Foglie di bosco e bacche rosse",
  },
  {
    id: "candycane",
    name: "Bastoncino di zucchero",
    subtitle: "Righe di menta e fiocco di festa",
  },
  {
    id: "gingerbread",
    name: "Biscotto speziato",
    subtitle: "Pan di zenzero e glassa reale",
  },
  {
    id: "starlight",
    name: "Notte stellata",
    subtitle: "Cielo d’inverno e stella cometa",
  },
  {
    id: "velvet",
    name: "Velluto di Babbo Natale",
    subtitle: "Rosso velluto e fibbia dorata",
  },
  {
    id: "frost",
    name: "Cristallo di ghiaccio",
    subtitle: "Fiocco d’argento e brina polare",
  },
  {
    id: "waxseal",
    name: "Lettera con ceralacca",
    subtitle: "Pergamena antica e sigillo rosso",
  },
  {
    id: "reindeer",
    name: "Slitta delle renne",
    subtitle: "Legno di baita e naso lucente",
  },
  {
    id: "lantern",
    name: "Lanterna nel bosco",
    subtitle: "Rami di pino e fiamma calda",
  },
  {
    id: "bells",
    name: "Campanelle in festa",
    subtitle: "Oro antico e nastro bordeaux",
  },
];

export const holidayBadgeIds = new Set(holidayBadges.map((badge) => badge.id));
export const badgeTextModes = new Set(["nickname", "name"]);

export function formatBadgeLabel({
  name = "",
  nickname = "",
  badgeText = "nickname",
} = {}) {
  const cleanName = String(name || "").trim();
  const cleanNickname = String(nickname || "").trim();
  if (badgeText === "name") return cleanName || cleanNickname || "Ospite";
  return cleanNickname || cleanName || "Ospite";
}
