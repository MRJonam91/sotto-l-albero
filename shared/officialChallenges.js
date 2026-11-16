import { HttpError, safeText } from "../worker/security.js";

// The Worker persists this definition when a round starts. The client receives
// only the challenge fields, so a later catalog edit cannot change its grading.
const catalog = {
  pacchi: {
    challenge: {
      edition: 2,
      type: "match",
      prompt:
        "Sei amici siedono in fila. Usa gli appunti per rimettere ogni pacco al posto giusto.",
      clues: [
        "La lanterna è subito a sinistra della tazza.",
        "Tra il libro e il puzzle c’è un solo posto. Il libro viene prima.",
        "La sciarpa è fra il libro e il puzzle.",
        "I biscotti sono a sinistra della lanterna.",
        "Tra la tazza e il puzzle ci sono due posti.",
        "Il libro è a destra della tazza.",
      ],
      people: [
        { id: "nina", label: "Nina" },
        { id: "teo", label: "Teo" },
        { id: "lea", label: "Lea" },
        { id: "omar", label: "Omar" },
        { id: "ada", label: "Ada" },
        { id: "milo", label: "Milo" },
      ],
      parcels: [
        { id: "libro", label: "Libro" },
        { id: "tazza", label: "Tazza" },
        { id: "puzzle", label: "Puzzle" },
        { id: "sciarpa", label: "Sciarpa" },
        { id: "lanterna", label: "Lanterna" },
        { id: "biscotti", label: "Biscotti" },
      ],
    },
    answer: {
      nina: "biscotti",
      teo: "lanterna",
      lea: "tazza",
      omar: "libro",
      ada: "sciarpa",
      milo: "puzzle",
    },
  },
  slitta: {
    challenge: {
      edition: 2,
      type: "pack",
      prompt:
        "Ogni pacco vale delle stelle. Trova il carico che ne porta di più senza superare peso o spazio.",
      clues: [
        "Il carico migliore vale 26 stelle. Puoi rimettere i pacchi sullo scaffale fino alla conferma.",
      ],
      limit: 16,
      capacity: 12,
      items: [
        { id: "libro", label: "Libri", weight: 6, space: 3, stars: 8 },
        { id: "tazza", label: "Tazze", weight: 4, space: 5, stars: 7 },
        { id: "gioco", label: "Giochi", weight: 5, space: 4, stars: 8 },
        { id: "coperta", label: "Coperte", weight: 3, space: 6, stars: 7 },
        { id: "pupazzo", label: "Pupazzo", weight: 2, space: 2, stars: 4 },
        { id: "lanterna", label: "Lanterna", weight: 7, space: 4, stars: 10 },
        { id: "biscotti", label: "Biscotti", weight: 2, space: 3, stars: 5 },
        { id: "sciarpa", label: "Sciarpe", weight: 1, space: 2, stars: 3 },
      ],
    },
    answer: 26,
  },
};

export function officialChallenge(game) {
  return Object.hasOwn(catalog, game) ? catalog[game] : null;
}

function knownUniqueItems(values, items) {
  const ids = new Set(items.map((item) => item.id));
  return (
    Array.isArray(values) &&
    values.length <= ids.size &&
    new Set(values).size === values.length &&
    values.every((value) => ids.has(value))
  );
}

export function scoreOfficialChallenge({ challenge, answer }, solution) {
  switch (challenge.type) {
    case "match": {
      if (
        !solution ||
        typeof solution !== "object" ||
        Array.isArray(solution) ||
        Object.keys(solution).length !== challenge.people.length ||
        !challenge.people.every(({ id }) => Object.hasOwn(solution, id)) ||
        !knownUniqueItems(Object.values(solution), challenge.parcels)
      ) {
        throw new HttpError("Abbina un pacco diverso a ogni persona.");
      }
      const correct = challenge.people.filter(
        ({ id }) => solution[id] === answer[id],
      ).length;
      return Math.round((correct * 100) / challenge.people.length);
    }
    case "pack": {
      if (!knownUniqueItems(solution, challenge.items) || !solution.length)
        throw new HttpError("Scegli i pacchi da caricare sulla slitta.");
      const cargo = challenge.items.filter(({ id }) => solution.includes(id));
      const weight = cargo.reduce((total, item) => total + item.weight, 0);
      if (challenge.edition === 2) {
        const space = cargo.reduce((total, item) => total + item.space, 0);
        const stars = cargo.reduce((total, item) => total + item.stars, 0);
        if (weight > challenge.limit || space > challenge.capacity) return 0;
        return Math.round((stars * 100) / answer);
      }
      return weight > challenge.limit
        ? 0
        : Math.round((weight * 100) / challenge.limit);
    }
    case "cipher": {
      if (challenge.edition === 2) {
        if (
          !Array.isArray(solution) ||
          solution.length !== answer.length ||
          !solution.every(
            (shift) => Number.isInteger(shift) && shift >= 0 && shift < 26,
          )
        )
          throw new HttpError("Scegli una posizione per entrambe le ruote.");
        return (
          50 * answer.filter((shift, index) => solution[index] === shift).length
        );
      }
      const text = safeText(solution, 120, true)
        .normalize("NFKC")
        .toLocaleLowerCase("it")
        .replace(/[.!?]+$/u, "")
        .trim()
        .replace(/\s+/gu, " ");
      return text === answer ? 100 : 0;
    }
    case "order": {
      if (
        !knownUniqueItems(solution, challenge.items) ||
        solution.length !== challenge.items.length
      )
        throw new HttpError("Metti tutti gli addobbi in fila, uno alla volta.");
      const correct = answer.filter(
        (item, index) => solution[index] === item,
      ).length;
      return Math.round((correct * 100) / answer.length);
    }
    default:
      throw new HttpError("Questa prova non è disponibile.", 409);
  }
}
