"use client";

import { useMe } from "@/lib/useMe";
import { CATEGORY_ICON } from "@/lib/categories";

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const { data, loading, error } = useMe();

  if (error) {
    return (
      <div className="card p-4 text-rust-400 text-sm">
        Couldn&apos;t load your ledger. Open this from inside Telegram. ({error})
      </div>
    );
  }
  if (loading || !data) {
    return <div className="text-paper-400 text-sm py-10 text-center">Loading your ledger…</div>;
  }

  const { user, summary } = data;
  const lang = user.language;
  const t = {
    greeting: lang === "kh" ? `សួស្តី ${user.firstName ?? ""}` : `Hi, ${user.firstName ?? "there"}`,
    ledger: lang ==="kh" ? "បញ្ជីកត់ត្រារបស់អ្នក" : "Your Ledger",
    remaining: lang === "kh" ? "នៅសល់ក្នុងជុំបើកប្រាក់នេះ" : "Remaining this pay period",
    safeDaily: lang === "kh" ? "ចំណាយប្រចាំថ្ងៃដែលមានសុវត្ថិភាព" : "Safe to spend per day",
    today: lang === "kh" ? "ចំណាយថ្ងៃនេះ" : "Spent today",
    daysLeft: lang === "kh" ? "ថ្ងៃនៅសល់" : "days left",
    payday: lang === "kh" ? "ថ្ងៃបើកប្រាក់បន្ទាប់" : "Next payday",
    categories: lang === "kh" ? "ប្រភេទចំណាយ" : "Categories",
  };

  const pct = Math.min((summary.period.daysElapsed / summary.period.daysTotal) * 100, 100);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-paper-400 text-sm">{t.greeting}</p>
        <h1 className="font-display text-2xl text-paper-50 mt-0.5">{t.ledger}</h1>
      </header>

      {/* Hero balance card */}
      <div className="card p-5">
        <p className="text-paper-400 text-xs uppercase tracking-wide">{t.remaining}</p>
        <p className={`figure text-4xl mt-1 ${summary.totals.remainingCash < 0 ? "text-rust-400" : "text-brass-400"}`}>
          ${fmt(summary.totals.remainingCash)}
        </p>

        <div className="mt-4 h-1.5 rounded-full bg-ink-700 overflow-hidden">
          <div className="h-full bg-brass-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] text-paper-400">
          <span>{fmtDate(summary.period.start)}</span>
          <span>{summary.period.daysRemaining} {t.daysLeft}</span>
          <span>{fmtDate(summary.period.nextPayday)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-ink-700">
          <div>
            <p className="text-paper-400 text-xs">{t.safeDaily}</p>
            <p className="figure text-lg text-paper-50">${fmt(summary.totals.safeDailySpend)}</p>
          </div>
          <div>
            <p className="text-paper-400 text-xs">{t.today}</p>
            <p className="figure text-lg text-paper-50">${fmt(summary.totals.todaySpent)}</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-paper-200 text-sm font-medium mb-2">{t.categories}</h2>
        <div className="space-y-2">
          {summary.categories.map((cat) => {
            const name = lang === "kh" ? cat.nameKh : cat.nameEn;
            const ratio = cat.budget > 0 ? Math.min(cat.spent / cat.budget, 1) : 0;
            return (
              <div key={cat.id} className="card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{CATEGORY_ICON[cat.key] ?? "🗂️"}</span>
                    <span className="text-paper-50 text-sm">{name}</span>
                  </div>
                  <span className={`figure text-sm ${cat.overBudget ? "text-rust-400" : "text-paper-200"}`}>
                    ${fmt(cat.spent)}{cat.budget > 0 ? ` / $${fmt(cat.budget)}` : ""}
                  </span>
                </div>
                {cat.budget > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-ink-700 overflow-hidden">
                    <div
                      className={`h-full ${cat.overBudget ? "bg-rust-400" : "bg-moss-400"}`}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
