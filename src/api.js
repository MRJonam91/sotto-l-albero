import { getLocale, t, registerGameMessages, clearGameMessages } from "./i18n.js";

export async function api(path, method = "GET", body) {
  let response;
  const sendsBody = method !== "GET" && method !== "HEAD";
  try {
    response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: {
        ...(sendsBody && { "Content-Type": "application/json" }),
        ...(/^\/(?:competition|practice)\//.test(path) && { "X-Game-Languages": "1" }),
      },
      body: sendsBody ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch {
    throw new Error("La connessione si è interrotta. Riprova tra poco.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "Qualcosa non è andato. Riprova tra poco."),
      {
        status: response.status,
      },
    );
  if (data.gameMessages) {
    registerGameMessages(data.gameMessages);
    delete data.gameMessages;
  }
  if (path === "/auth/logout") clearGameMessages();
  return data;
}
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat(getLocale(), {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : t("Da decidere");
export const money = (value) =>
  new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
export const statusLabel = (value) =>
  t(({
    draft: "Da preparare",
    open: "Iscrizioni aperte",
    closed: "Iscrizioni chiuse",
    drawn: "Nomi estratti",
    archived: "Concluso",
    cancelled: "Da rifare",
    drawing: "Estrazione in corso",
    error: "Regole da rivedere",
  })[value] || value);
export const activeMember = (value) =>
  ["approved", "confirmed"].includes(value);
