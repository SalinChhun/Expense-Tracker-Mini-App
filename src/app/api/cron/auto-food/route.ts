import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/telegram";
import { MEAL_COST_DEFAULT } from "@/lib/categories";

// Triggered once daily, right after local midnight (see vercel.json).
// For every user's "food" category, checks whether the day that JUST ENDED
// has any logged expense at all. If none, auto-inserts one expense for the
// default daily food total and sends a Telegram alert about it (same
// pattern as the bill-due cron). This is intentionally global (not a
// per-user toggle) — every user gets this behavior.
const AUTO_FOOD_AMOUNT = MEAL_COST_DEFAULT.breakfast + MEAL_COST_DEFAULT.lunch + MEAL_COST_DEFAULT.dinner;

// Vercel's serverless functions run with the system clock in UTC, so plain
// `new Date().getDate()` does NOT reflect Cambodia's wall-clock day — it's
// a full day behind during 00:00–07:00 Asia/Phnom_Penh (= 17:00–24:00 UTC
// the previous day), which is exactly when this cron fires. Asia/Phnom_Penh
// has no daylight saving, so a fixed +7h offset is safe to hardcode.
const APP_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Shift "now" into Cambodia wall-clock time, then work entirely within
    // that shifted timeline so getUTCFullYear/Month/Date() below return the
    // correct LOCAL calendar day instead of the (potentially stale) UTC one.
    const nowShifted = new Date(Date.now() + APP_TZ_OFFSET_MS);
    const targetShifted = new Date(nowShifted);
    targetShifted.setUTCDate(targetShifted.getUTCDate() - 1); // the local day that just ended

    // Convert that local day's midnight-to-midnight window back to real UTC
    // instants for the DB query (spentAt is stored as an absolute UTC instant).
    const y = targetShifted.getUTCFullYear();
    const m = targetShifted.getUTCMonth();
    const d = targetShifted.getUTCDate();
    const dayStart = new Date(Date.UTC(y, m, d, 0, 0, 0) - APP_TZ_OFFSET_MS);
    const dayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - APP_TZ_OFFSET_MS);
    const loggedAt = new Date(Date.UTC(y, m, d, 20, 0, 0) - APP_TZ_OFFSET_MS);

    const foodCategories = await prisma.category.findMany({
        where: { key: "food", isArchived: false },
        include: { user: true },
    });

    let created = 0;
    let sent = 0;
    for (const cat of foodCategories) {
        const existing = await prisma.expense.findFirst({
            where: { userId: cat.userId, categoryId: cat.id, spentAt: { gte: dayStart, lte: dayEnd } },
            select: { id: true },
        });
        if (existing) continue; // user already logged something for food that day — don't override

        const note =
            cat.user.language === "kh"
                ? "កត់ត្រាដោយស្វ័យប្រវត្តិ (គ្មានចំណាយអាហារថ្ងៃនោះ)"
                : "Auto-logged (no food entries that day)";

        await prisma.expense.create({
            data: {
                userId: cat.userId,
                categoryId: cat.id,
                amount: AUTO_FOOD_AMOUNT,
                note,
                spentAt: loggedAt,
            },
        });
        created++;

        const name = cat.user.language === "kh" ? cat.nameKh : cat.nameEn;
        // targetShifted's UTC-getters already hold the correct local Y/M/D, so
        // formatting with timeZone: "UTC" avoids the runtime re-shifting it again.
        const dateLabel = targetShifted.toLocaleDateString(cat.user.language === "kh" ? "km-KH" : undefined, {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
        });
        const text =
            cat.user.language === "kh"
                ? `🍜 មិនឃើញអ្នកកត់ត្រា ${name} សម្រាប់ថ្ងៃទី ${dateLabel} ទេ — បានកត់ត្រាដោយស្វ័យប្រវត្តិ $${AUTO_FOOD_AMOUNT.toFixed(2)}។ អ្នកអាចកែប្រែវានៅក្នុងបញ្ជីចំណាយ។`
                : `🍜 No ${name.toLowerCase()} logged for ${dateLabel} — auto-logged $${AUTO_FOOD_AMOUNT.toFixed(2)} to your ledger. You can edit it anytime in Recent.`;
        const ok = await sendMessage(cat.user.telegramId, text);
        if (ok) sent++;
    }

    return NextResponse.json({ ok: true, checked: foodCategories.length, created, sent });
}