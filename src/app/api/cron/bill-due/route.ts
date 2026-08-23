import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/telegram";

// Triggered once daily (e.g. 08:00 APP_TIMEZONE) via Vercel Cron.
// Checks every user's categories for a fixedDay matching today's
// day-of-month and sends a due-today reminder.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayDay = new Date().getDate();

  const dueCategories = await prisma.category.findMany({
    where: { fixedDay: todayDay, isArchived: false },
    include: { user: true },
  });

  let sent = 0;
  for (const cat of dueCategories) {
    const name = cat.user.language === "kh" ? cat.nameKh : cat.nameEn;
    const text =
      cat.user.language === "kh"
        ? `🏠 រំលឹក: ត្រូវបង់ ${name} ($${cat.budget.toFixed(2)}) ថ្ងៃនេះ!`
        : `🏠 Reminder: ${name} payment ($${cat.budget.toFixed(2)}) is due today!`;
    const ok = await sendMessage(cat.user.telegramId, text);
    if (ok) sent++;
  }

  return NextResponse.json({ ok: true, sent, checked: dueCategories.length });
}
