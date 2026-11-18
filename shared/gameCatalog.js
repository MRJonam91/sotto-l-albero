export const gameCatalog = [
  {
    id: "quiz",
    name: "Quiz di Natale",
    description: "Domande natalizie, una alla volta.",
    points: 300,
    kind: "quiz",
  },
  {
    id: "memory",
    name: "Memory di Natale",
    description: "Trova le otto coppie tra i ricordi di Natale.",
    points: 300,
    kind: "memory",
  },
  {
    id: "film",
    name: "Indovina il film",
    description: "Riconosci il film di Natale dalla sequenza di icone.",
    points: 200,
    kind: "film",
  },
  {
    id: "pacchi",
    name: "Pacchi smarriti",
    description: "Abbina i pacchi alle persone seguendo gli indizi.",
    points: 100,
    kind: "challenge",
  },
  {
    id: "slitta",
    name: "Sacco della slitta",
    description: "Prepara il carico rispettando lo spazio della slitta.",
    points: 100,
    kind: "challenge",
  },
  {
    id: "cartolina",
    name: "La cartolina scomparsa",
    description: "Esplora due stanze e ricomponi il mistero della cartolina.",
    points: 100,
    kind: "challenge",
  },
  {
    id: "addobbi",
    name: "Prendi i pacchi",
    description: "Riconosci i timbri e raccogli i pacchi sul nastro.",
    points: 100,
    kind: "challenge",
  },
  {
    id: "tris",
    name: "Tris sulla neve",
    description:
      "Allenati contro il computer o sfida un amico sulla stessa griglia.",
    points: 0,
    kind: "challenge",
    ranked: false,
  },
];

export const gameDefinitions = Object.fromEntries(
  gameCatalog
    .filter((game) => game.ranked !== false)
    .map(({ id, name, points }) => [id, { name, points }]),
);
