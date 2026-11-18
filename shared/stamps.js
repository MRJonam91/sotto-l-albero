import { seasonalStamps } from "./seasonalStamps.js";

export const stamps = {
  star: {
    name: "Stella d’oro",
    hint: "Nella sfera nevica piano.\nTra i fiocchi cerca una luce.",
  },
  teapot: {
    name: "Teiera delle feste",
    hint: "Vicino alla lettera dei desideri\nqualcuno ha messo su il tè.",
  },
  gift: {
    name: "Pacco a sorpresa",
    hint: "Un pacco si è perso tra i desideri.\nLo riconosci dal fiocco.",
    story: "Hai trovato il pacchetto nascosto fra i desideri.",
  },
  bell: {
    name: "Campanella",
    hint: "Tra i Natali già passati\nuna campanella aspetta di suonare.",
    story: "Hai trovato la campanella che custodisce i Natali passati.",
  },
  quiz: {
    name: "Maestro del quiz",
    hint: "Cinque domande, una dopo l’altra,\ne il timbro è tuo.",
  },
  memory: {
    name: "Memoria da elfo",
    hint: "Ogni carta ha una gemella.\nIl timbro è dietro l’ultima coppia.",
  },
  santa: {
    name: "Babbo Natale",
    hint: "Cinque minuti dopo mezzanotte\nguarda tra i rami, prima che riparta.",
    story:
      "Babbo Natale è passato tra i rami. Per un attimo la neve ha smesso di cadere.",
    section: "events",
    window: [5, 65],
  },
  ice: {
    name: "Cristallo di ghiaccio",
    hint: "Al mattino, conta le facce di un dado.\nA quell’ora cerca tra i Natali passati.",
    story: "Un cristallo è rimasto attaccato alla prima pagina dell’archivio.",
    section: "archive",
    window: [6 * 60, 8 * 60],
  },
  cookie: {
    name: "Biscotti di Natale",
    hint: "Al mattino, conta le zampe di un ragno.\nA quell’ora, tra i giochi, cerca qualcosa da sgranocchiare.",
    story:
      "Tra una partita e l’altra, qualcuno ha lasciato dei biscotti appena sfornati.",
    section: "games",
    window: [8 * 60, 10 * 60],
  },
  hat: {
    name: "Cappello di Babbo Natale",
    hint: "Quando è ora di pranzo,\ncerca un pompon tra i desideri.",
    story:
      "Il vento ha portato il cappello di Babbo Natale tra le lettere dei desideri.",
    section: "wishes",
    window: [12 * 60, 14 * 60],
  },
  reindeer: {
    name: "Renna della sera",
    hint: "Quando sono le sette di sera,\nqualcuno si muove tra i rami dell’abete.",
    story:
      "Una renna si è fermata al riparo dei rami, prima di rimettersi in viaggio.",
    section: "events",
    window: [19 * 60, 21 * 60],
  },
  sleigh: {
    name: "Slitta sulla neve",
    hint: "Tre ore prima di mezzanotte\ntra i rami si sentono i pattini sulla neve.",
    story:
      "Due tracce nella neve e il rumore dei pattini. La slitta è pronta a partire.",
    section: "events",
    window: [21 * 60, 23 * 60],
  },
  ...seasonalStamps,
};

const italianClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isStampAvailable(stamp, time) {
  if (!stamp.window) return true;
  const [hour, minute] = italianClock.format(time).split(":").map(Number);
  const minuteOfDay = hour * 60 + minute;
  const [start, end] = stamp.window;
  return minuteOfDay >= start && minuteOfDay < end;
}
