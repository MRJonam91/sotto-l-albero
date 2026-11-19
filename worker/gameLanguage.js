import generated from "./locales/gameText.json";
import puzzles from "./locales/puzzleText.js";
import quiz from "./locales/quizReviewed.js";
import { json } from "./security.js";

const gameText = { ...generated, ...quiz, ...puzzles };

// Only inspect fields already disclosed by the public game projection.
// The complete question bank and its translations never enter the frontend bundle.
export function gameGlossary(data) {
  const found = Object.create(null);
  function add(value) {
    if (typeof value === "string" && Object.hasOwn(gameText, value))
      found[value] = gameText[value];
  }
  function question(q) {
    if (!q) return;
    [q.title, q.text, q.prompt, q.note, ...(q.options || [])].forEach(add);
  }
  function challenge(c) {
    if (!c) return;
    [c.title, c.prompt, ...(c.clues || [])].forEach(add);
    for (const list of [
      c.objects,
      c.notes,
      c.people,
      c.parcels,
      c.items,
      c.options,
    ]) {
      for (const item of list || []) {
        if (Array.isArray(item)) add(item[1]);
        else {
          add(item.label);
          add(item.note);
        }
      }
    }
  }
  for (const view of [data, data.attempt, ...(data.active || [])].filter(
    Boolean,
  )) {
    question(view.question);
    challenge(view.challenge);
    for (const item of view.review?.items || []) question(item);
    if (typeof view.feedback === "object" && view.feedback) {
      add(view.feedback.title);
      add(view.feedback.note);
    }
  }
  return found;
}

export async function withGameLanguage(response, request) {
  if (!response.ok || request.headers.get("X-Game-Languages") !== "1")
    return response;
  const data = await response.json();
  const messages = gameGlossary(data);
  if (Object.keys(messages).length) data.gameMessages = messages;
  return json(data, response.status);
}
