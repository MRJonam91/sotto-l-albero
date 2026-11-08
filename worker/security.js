export class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export const id = () => crypto.randomUUID();
export const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
export async function digest(value) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
export function isLocalRequest(request, env) {
  return (
    env.LOCAL_DEV === "true" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
  );
}
export function validEmail(value) {
  const email = String(value || "")
    .trim()
    .toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError("Controlla l’indirizzo email.");
  return email;
}
export function validPhone(value) {
  const text = safeText(value, 32).replace(/[\s().-]/g, "");
  const phone = text.startsWith("00") ? "+" + text.slice(2) : text;
  if (!/^\+[1-9][0-9]{6,14}$/.test(phone))
    throw new HttpError(
      "Inserisci il numero con il prefisso internazionale, per esempio +39.",
    );
  return phone;
}
export function safeText(value, max = 1000, required = false) {
  if (typeof value !== "string" && value != null)
    throw new HttpError("Questo campo deve contenere del testo.");
  const text = (value || "").trim();
  if (text.length > max || (required && !text))
    throw new HttpError(
      required && !text
        ? "Compila i campi richiesti."
        : `Il testo può contenere al massimo ${max} caratteri.`,
    );
  return text;
}
export function safeUrl(value) {
  if (!value) return "";
  try {
    const u = new URL(value);
    if (!["https:", "http:"].includes(u.protocol)) throw new Error();
    return u.href;
  } catch {
    throw new HttpError(
      "Inserisci un collegamento che inizi con https:// o http://.",
    );
  }
}
export const json = (value, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
export const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
