import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/telegram";

// Triggered once daily (e.g. 21:00 APP_TIMEZONE) via Vercel Cron.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const users = await prisma.user.findMany({ where: { eodNagEnabled: true } });

  let sent = 0;
  for (const user of users) {
    const hasExpense = await prisma.expense.findFirst({
      where: { userId: user.id, spentAt: { gte: todayStart, lte: todayEnd } },
      select: { id: true },
    });
    if (hasExpense) continue;

    const text =
      user.language === "kh"
        ? "📝 អ្នកមិនទាន់កត់ត្រាចំណាយថ្ងៃនេះទេ។ បើកកម្មវិធីដើម្បីបញ្ចូល (ស្រេចចិត្ត)"
        : "📝 You haven't logged any expense today. Open the app to add one (optional).";
    const ok = await sendMessage(user.telegramId, text);
    if (ok) sent++;
  }

  return NextResponse.json({ ok: true, sent, total: users.length });
}
