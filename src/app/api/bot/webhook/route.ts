import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMessage, miniAppButton } from "@/lib/telegram";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

const MINI_APP_URL = process.env.MINI_APP_URL!; // e.g. https://your-app.vercel.app
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

// Telegram sends updates here as POST requests. Set this URL via
// setWebhook (see README) with secret_token = TELEGRAM_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const update = await req.json();
  const message = update.message;
  if (!message?.text || !message?.from) {
    return NextResponse.json({ ok: true }); // ignore non-text updates
  }

  const chatId: number = message.chat.id;
  const from = message.from;
  const text: string = message.text.trim();

  if (text === "/start") {
    const telegramId = BigInt(from.id);
    const existing = await prisma.user.findUnique({ where: { telegramId } });

    if (!existing) {
      await prisma.user.create({
        data: {
          telegramId,
          username: from.username,
          firstName: from.first_name,
          language: from.language_code === "km" ? "kh" : "en",
          categories: {
            create: DEFAULT_CATEGORIES.map((c) => ({
              key: c.key,
              nameEn: c.nameEn,
              nameKh: c.nameKh,
              budget: c.budget,
              fixedDay: c.fixedDay,
              sortOrder: c.sortOrder,
            })),
          },
        },
      });
    }

    const lang = from.language_code === "km" ? "kh" : "en";
    const welcome =
      lang === "kh"
        ? "👋 សូមស្វាគមន៍! ចុចប៊ូតុងខាងក្រោមដើម្បីបើកកម្មវិធីតាមដានចំណាយរបស់អ្នក។"
        : "👋 Welcome! Tap the button below to open your expense tracker.";
    const buttonText = lang === "kh" ? "📒 បើកបញ្ជីចំណាយ" : "📒 Open Expense Tracker";

    await sendMessage(chatId, welcome, {
      replyMarkup: miniAppButton(buttonText, MINI_APP_URL),
    });
    return NextResponse.json({ ok: true });
  }

  if (text === "/help") {
    await sendMessage(
      chatId,
      "Tap the menu button or send /start to open your expense tracker Mini App. " +
        "All logging, budgets, and salary settings live inside the app."
    );
    return NextResponse.json({ ok: true });
  }

  // Any other text: just point them to the Mini App
  await sendMessage(chatId, "Use the button from /start to open the app, or send /start again.");
  return NextResponse.json({ ok: true });
}
