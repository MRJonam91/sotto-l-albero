export const gameCatalog = [
  {
    id: "quiz",
    name: "Quiz di Natale",
    description: "Domande natalizie, una alla volta.",
    points: 300,
    kind: "quiz",
    ranked: true,
    practiceEngine: "server",
    modes: ["practice", "ranked", "friends"],
  },
  {
    id: "memory",
    name: "Memory di Natale",
    description: "Trova le otto coppie tra i ricordi di Natale.",
    points: 300,
    kind: "memory",
    ranked: true,
    practiceEngine: "server",
    modes: ["practice", "ranked"],
  },
  {
    id: "film",
    name: "Indovina il film",
    description: "Riconosci il film di Natale dalla sequenza di icone.",
    points: 200,
    kind: "film",
    ranked: true,
    practiceEngine: "server",
    modes: ["practice", "ranked"],
  },
  {
    id: "pacchi",
    name: "Pacchi smarriti",
    description: "Abbina i pacchi alle persone seguendo gli indizi.",
    points: 100,
    kind: "challenge",
    ranked: true,
    practiceEngine: "server",
    modes: ["practice", "ranked"],
  },
  {
    id: "slitta",
    name: "Sacco della slitta",
    description: "Prepara il carico rispettando lo spazio della slitta.",
    points: 100,
    kind: "challenge",
    ranked: true,
    practiceEngine: "server",
    modes: ["practice", "ranked"],
  },
  {
    id: "cartolina",
    name: "La cartolina scomparsa",
    description: "Esplora due stanze e ricomponi il mistero della cartolina.",
    points: 100,
    kind: "challenge",
    ranked: true,
    practiceEngine: "server",
    modes: ["practice", "ranked"],
  },
  {
    id: "addobbi",
    name: "Prendi i pacchi",
    description: "Riconosci i timbri e raccogli i pacchi sul nastro.",
    points: 100,
    kind: "challenge",
    ranked: true,
    practiceEngine: "server",
    modes: ["practice", "ranked"],
  },
  {
    id: "tris",
    name: "Tris sulla neve",
    description:
      "Allenati contro il computer o sfida un amico sulla stessa griglia.",
    points: 0,
    kind: "challenge",
    ranked: false,
    practiceEngine: "server",
    modes: ["computer", "friends"],
  },
  {
    id: "curling",
    name: "Curling dei regali",
    description:
      "Fai scivolare i regali vicino alla lanterna. Gli urti possono cambiare la partita.",
    points: 0,
    kind: "local",
    ranked: false,
    practiceEngine: "local",
    modes: ["computer"],
  },
];

export const gameModeLabels = {
  practice: "Allenamento libero",
  ranked: "Sfida a punti",
  friends: "Con un amico",
  computer: "Contro il computer",
};

export const gameDefinitions = Object.fromEntries(
  gameCatalog
    .filter((game) => game.ranked !== false)
    .map(({ id, name, points }) => [id, { name, points }]),
);
