import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/telegram";
import { MEAL_COST_DEFAULT } from "@/lib/categories";

// Triggered by Vercel Cron (see vercel.json) at fixed UTC times matching
// 7am / 12pm / 6pm in APP_TIMEZONE (default Asia/Phnom_Penh, UTC+7 — no DST).
// Pass ?meal=breakfast|lunch|dinner as a query param from the cron config.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meal = (new URL(req.url).searchParams.get("meal") ?? "") as "breakfast" | "lunch" | "dinner";
  if (!["breakfast", "lunch", "dinner"].includes(meal)) {
    return NextResponse.json({ error: "meal query param required" }, { status: 400 });
  }

  const cost = MEAL_COST_DEFAULT[meal];
  const users = await prisma.user.findMany();

  const MSG = {
    breakfast: { en: `🍳 Time for breakfast! Suggested budget: $${cost.toFixed(2)}`, kh: `🍳 ដល់ពេលអាហារពេលព្រឹកហើយ! ថវិកាណែនាំ: $${cost.toFixed(2)}` },
    lunch: { en: `🍜 Time for lunch! Suggested budget: $${cost.toFixed(2)}`, kh: `🍜 ដល់ពេលអាហារថ្ងៃត្រង់ហើយ! ថវិកាណែនាំ: $${cost.toFixed(2)}` },
    dinner: { en: `🍽️ Time for dinner! Suggested budget: $${cost.toFixed(2)}`, kh: `🍽️ ដល់ពេលអាហារពេលល្ងាចហើយ! ថវិកាណែនាំ: $${cost.toFixed(2)}` },
  }[meal];

  let sent = 0;
  for (const user of users) {
    const text = user.language === "kh" ? MSG.kh : MSG.en;
    const ok = await sendMessage(user.telegramId, text);
    if (ok) sent++;
  }

  return NextResponse.json({ ok: true, meal, sent, total: users.length });
}
