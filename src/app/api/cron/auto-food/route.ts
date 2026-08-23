import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/telegram";

// Triggered once daily (e.g. 08:00 APP_TIMEZONE) via Vercel Cron.
// For every category with a fixedDay matching today's day-of-month:
//   1. Auto-creates an expense for that category's budget amount, UNLESS
//      one was already logged for that category earlier this month (so
//      re-running the cron, or the user having already paid manually,
//      never double-charges).
//   2. Sends a "payment due" message either way — noting whether it was
//      auto-logged or the user should log it themselves (if budget is $0).
// This is global/automatic — not a per-user setting.
export async function GET(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayDay = now.getDate();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const dueCategories = await prisma.category.findMany({
        where: { fixedDay: todayDay, isArchived: false },
        include: { user: true },
    });

    let sent = 0;
    let created = 0;
    for (const cat of dueCategories) {
        let autoLogged = false;

        if (cat.budget > 0) {
            const alreadyPaidThisMonth = await prisma.expense.findFirst({
                where: { userId: cat.userId, categoryId: cat.id, spentAt: { gte: monthStart } },
                select: { id: true },
            });
            if (!alreadyPaidThisMonth) {
                const note = cat.user.language === "kh" ? "កត់ត្រាដោយស្វ័យប្រវត្តិ (វិក្កយបត្រប្រចាំខែ)" : "Auto-logged (fixed monthly bill)";
                await prisma.expense.create({
                    data: {
                        userId: cat.userId,
                        categoryId: cat.id,
                        amount: cat.budget,
                        note,
                        spentAt: now,
                    },
                });
                autoLogged = true;
                created++;
            }
        }

        const name = cat.user.language === "kh" ? cat.nameKh : cat.nameEn;
        const text = buildMessage(cat.user.language, name, cat.budget, autoLogged);
        const ok = await sendMessage(cat.user.telegramId, text);
        if (ok) sent++;
    }

    return NextResponse.json({ ok: true, sent, created, checked: dueCategories.length });
}

function buildMessage(lang: "en" | "kh", name: string, budget: number, autoLogged: boolean): string {
    if (lang === "kh") {
        return autoLogged
            ? `🏠 ត្រូវបង់ ${name} ($${budget.toFixed(2)}) ថ្ងៃនេះ — បានកត់ត្រាដោយស្វ័យប្រវត្តិរួចហើយ។`
            : `🏠 រំលឹក: ត្រូវបង់ ${name} ថ្ងៃនេះ!`;
    }
    return autoLogged
        ? `🏠 ${name} payment ($${budget.toFixed(2)}) was due today — auto-logged to your ledger.`
        : `🏠 Reminder: ${name} payment is due today!`;
}