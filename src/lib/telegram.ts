import crypto from "node:crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
  language_code?: string;
};

/**
 * Verifies the `initData` string that Telegram signs and passes to every
 * Mini App on load. This is the ONLY safe way to know which Telegram user
 * is making a request from inside the web app — never trust a client-sent
 * user id without this check.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(initData: string, maxAgeSeconds = 86400): TelegramUser | null {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return null;

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) return null;

  const userJson = params.get("user");
  if (!userJson) return null;

  try {
    return JSON.parse(userJson) as TelegramUser;
  } catch {
    return null;
  }
}

export async function sendMessage(chatId: number | bigint, text: string, opts?: {
  replyMarkup?: unknown;
  parseMode?: "Markdown" | "HTML";
}) {
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId.toString(),
      text,
      parse_mode: opts?.parseMode ?? "HTML",
      reply_markup: opts?.replyMarkup,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("sendMessage failed", res.status, body);
  }
  return res.ok;
}

export function miniAppButton(text: string, url: string) {
  return {
    inline_keyboard: [[{ text, web_app: { url } }]],
  };
}
