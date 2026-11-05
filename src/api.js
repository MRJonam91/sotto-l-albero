export async function api(path, method = "GET", body) {
  let response;
  const sendsBody = method !== "GET" && method !== "HEAD";
  try {
    response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: sendsBody ? { "Content-Type": "application/json" } : undefined,
      body: sendsBody ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch {
    throw new Error("La connessione si è interrotta. Riprova tra poco.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "Qualcosa non è andato. Riprova tra poco.");
  return data;
}
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat("it-IT", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "Da decidere";
export const money = (value) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value || 0);
export const statusLabel = (value) =>
  ({
    draft: "Da preparare",
    open: "Iscrizioni aperte",
    closed: "Iscrizioni chiuse",
    drawn: "Nomi estratti",
    archived: "Concluso",
    cancelled: "Da rifare",
    drawing: "Estrazione in corso",
    error: "Regole da rivedere",
  })[value] || value;
export const activeMember = (value) =>
  ["approved", "confirmed"].includes(value);
