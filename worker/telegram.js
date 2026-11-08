import { run } from "./auth.js";
import { digest, HttpError, json, token } from "./security.js";

const apiRoot = "https://api.telegram.org";

export function privateChatId(value) {
  const text = String(value ?? "");
  return /^[1-9]\d{0,15}$/.test(text) && Number.isSafeInteger(Number(text))
    ? text
    : null;
}

function hasBotToken(env) {
  return /^\d+:[A-Za-z0-9_-]+$/.test(env.TELEGRAM_BOT_TOKEN || "");
}

export function telegramAvailable(env) {
  return (
    hasBotToken(env) &&
    /^[A-Za-z0-9_]{5,32}$/.test(env.TELEGRAM_BOT_USERNAME || "") &&
    /^[A-Za-z0-9_-]{1,256}$/.test(env.TELEGRAM_WEBHOOK_SECRET || "")
  );
}

export class TelegramError extends HttpError {
  constructor(status, retryAfter) {
    super("Telegram non risponde. Riprova tra poco.", 503);
    this.permanent = status >= 400 && status < 500 && status !== 429;
    this.retryAfter = Math.max(0, Number(retryAfter) || 0);
  }
}

async function telegramCall(env, method, data) {
  if (!hasBotToken(env)) throw new TelegramError(401);
  const multipart = data instanceof FormData;
  let response;
  let payload;
  try {
    response = await fetch(
      `${apiRoot}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
      {
        method: "POST",
        headers: multipart ? undefined : { "Content-Type": "application/json" },
        body: multipart ? data : JSON.stringify(data),
        redirect: "error",
        signal: AbortSignal.timeout(12000),
      },
    );
    payload = await response.json();
  } catch {
    throw new TelegramError();
  }
  if (!response.ok || !payload.ok) {
    throw new TelegramError(
      payload.error_code || response.status,
      payload.parameters?.retry_after,
    );
  }
  return payload.result;
}

export function telegramMessage(env, chatId, text) {
  const chat = privateChatId(chatId);
  if (!chat) throw new TelegramError(400);
  return telegramCall(env, "sendMessage", {
    chat_id: chat,
    text,
    protect_content: true,
    link_preview_options: { is_disabled: true },
  });
}

export async function readBoundedBytes(source, limit) {
  const declared = Number(source.headers.get("Content-Length"));
  if (declared > limit)
    throw new HttpError("La richiesta è troppo grande.", 413);
  if (!source.body) return new Uint8Array();
  const reader = source.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel().catch(() => {});
        throw new HttpError("La richiesta è troppo grande.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function createTelegramLink(env, userId) {
  if (!telegramAvailable(env))
    throw new HttpError("Telegram non è ancora disponibile.", 503);
  const value = token();
  const expiresAt = Date.now() + 10 * 60_000;
  await run(
    env.DB,
    `INSERT INTO telegram_links(user_id,digest,expires_at) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET digest=excluded.digest,expires_at=excluded.expires_at`,
    userId,
    await digest(value),
    expiresAt,
  );
  return json({
    url: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${value}`,
    expiresAt,
  });
}

export async function disconnectTelegram(env, userId) {
  const db = env.DB;
  await db.batch([
    db
      .prepare(
        "UPDATE users SET telegram_chat_id=NULL,notify_telegram=0 WHERE id=?",
      )
      .bind(userId),
    db.prepare("DELETE FROM telegram_links WHERE user_id=?").bind(userId),
  ]);
}

function matchesSecret(provided, expected) {
  if (!provided || provided.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++)
    difference |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

export async function telegramWebhook(request, env) {
  if (request.method !== "POST")
    throw new HttpError("Metodo non disponibile.", 405);
  if (!telegramAvailable(env))
    throw new HttpError("Telegram non è ancora disponibile.", 503);
  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!matchesSecret(secret, env.TELEGRAM_WEBHOOK_SECRET))
    throw new HttpError("Accesso non autorizzato.", 403);
  let update;
  try {
    update = JSON.parse(
      new TextDecoder().decode(await readBoundedBytes(request, 32_768)),
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("Dati Telegram non validi.");
  }
  const message = update?.message;
  const chatId = privateChatId(message?.chat?.id);
  const command = /^\/start(?:@[A-Za-z0-9_]+)? ([a-f0-9]{64})$/.exec(
    message?.text || "",
  );
  if (
    message?.chat?.type !== "private" ||
    !chatId ||
    chatId !== privateChatId(message?.from?.id) ||
    message?.from?.is_bot ||
    !command
  )
    return json({ ok: true });

  const db = env.DB;
  const hash = await digest(command[1]);
  const now = Date.now();
  const result = await db.batch([
    db
      .prepare(
        `UPDATE users SET telegram_chat_id=?,
      notify_telegram=CASE WHEN telegram_chat_id=? THEN notify_telegram ELSE 0 END
      WHERE id=(SELECT user_id FROM telegram_links WHERE digest=? AND expires_at>?)
      AND NOT EXISTS(SELECT 1 FROM users other WHERE other.telegram_chat_id=? AND other.id<>users.id)`,
      )
      .bind(chatId, chatId, hash, now, chatId),
    db
      .prepare(
        `DELETE FROM telegram_links WHERE digest=? AND expires_at>?
      AND EXISTS(SELECT 1 FROM users WHERE users.id=telegram_links.user_id AND telegram_chat_id=?)`,
      )
      .bind(hash, now, chatId),
  ]);
  if (result[0].meta.changes) {
    // The profile can see the connection even if this courtesy reply fails.
    await telegramMessage(
      env,
      chatId,
      "Telegram è collegato a Sotto l’Albero. Torna al profilo per scegliere se ricevere gli avvisi qui.",
    ).catch(() => {});
  }
  return json({ ok: true });
}
