"use client";

import { useState } from "react";
import { useMe } from "@/lib/useMe";
import { apiFetch } from "@/lib/apiClient";
import { CATEGORY_ICON } from "@/lib/categories";
import { useTelegram } from "@/components/TelegramProvider";

export default function SpendPage() {
  const { data, loading, reload } = useMe();
  const { initData, haptic } = useTelegram();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  if (loading || !data) return <div className="text-paper-400 text-sm py-10 text-center">Loading…</div>;
  const lang = data.user.language;
  const t = {
    title: lang === "kh" ? "កត់ត្រាចំណាយ" : "Log an expense",
    chooseCategory: lang === "kh" ? "ជ្រើសរើសប្រភេទ" : "Choose a category",
    amount: lang === "kh" ? "ចំនួនទឹកប្រាក់ ($)" : "Amount ($)",
    note: lang === "kh" ? "កំណត់ចំណាំ (ស្រេចចិត្ត)" : "Note (optional)",
    log: lang === "kh" ? "កត់ត្រា" : "Log expense",
    logging: lang === "kh" ? "កំពុងកត់ត្រា…" : "Logging…",
  };

  async function submit() {
    if (!categoryId || !data) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setFeedback({ ok: false, text: lang === "kh" ? "សូមបញ្ចូលចំនួនត្រឹមត្រូវ" : "Enter a valid amount." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiFetch("/api/expense", initData, {
        method: "POST",
        body: JSON.stringify({ categoryId, amount: value, note: note || undefined }),
      });
      haptic("medium");
      const cat = data.summary.categories.find((c) => c.id === categoryId)!;
      const newSpent = cat.spent + value;
      const overNow = cat.budget > 0 && newSpent > cat.budget;
      const name = lang === "kh" ? cat.nameKh : cat.nameEn;

      if (cat.budget <= 0) {
        setFeedback({ ok: true, text: lang === "kh" ? `✅ បានកត់ត្រា $${value.toFixed(2)} សម្រាប់ ${name}` : `✅ Logged $${value.toFixed(2)} for ${name}.` });
      } else if (overNow) {
        const over = newSpent - cat.budget;
        setFeedback({ ok: false, text: lang === "kh" ? `⚠️ អ្នកចំណាយលើសថវិកា ${name} ចំនួន $${over.toFixed(2)}` : `⚠️ You're $${over.toFixed(2)} over your ${name} budget this period.` });
      } else {
        const remaining = cat.budget - newSpent;
        setFeedback({ ok: true, text: lang === "kh" ? `👍 នៅសល់ $${remaining.toFixed(2)} សម្រាប់ ${name}` : `👍 Nice — $${remaining.toFixed(2)} left for ${name} this period.` });
      }
      setAmount("");
      setNote("");
      setCategoryId(null);
      reload();
    } catch (e) {
      setFeedback({ ok: false, text: e instanceof Error ? e.message : "Failed to log expense." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl text-paper-50">{t.title}</h1>

      <div>
        <p className="text-paper-400 text-xs uppercase tracking-wide mb-2">{t.chooseCategory}</p>
        <div className="grid grid-cols-3 gap-2">
          {data.summary.categories.map((cat) => {
            const name = lang === "kh" ? cat.nameKh : cat.nameEn;
            const active = categoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setCategoryId(cat.id); haptic("light"); }}
                className={`card p-3 flex flex-col items-center gap-1 text-center transition-colors ${
                  active ? "border-brass-400 bg-ink-800" : ""
                }`}
              >
                <span className="text-xl">{CATEGORY_ICON[cat.key] ?? "🗂️"}</span>
                <span className="text-[11px] text-paper-200 leading-tight">{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-paper-400 text-xs uppercase tracking-wide">{t.amount}</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="figure w-full mt-1 bg-ink-800 border border-ink-700 rounded-card px-3 py-3 text-xl text-paper-50 outline-none focus:border-brass-400"
          />
        </div>
        <div>
          <label className="text-paper-400 text-xs uppercase tracking-wide">{t.note}</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={lang === "kh" ? "ឧ. សាប៊ូងូតទឹក" : "e.g. Body wash"}
            className="w-full mt-1 bg-ink-800 border border-ink-700 rounded-card px-3 py-2.5 text-sm text-paper-50 outline-none focus:border-brass-400"
          />
        </div>

        <button
          onClick={submit}
          disabled={!categoryId || submitting}
          className="w-full py-3 rounded-card bg-brass-500 text-ink-950 font-medium disabled:opacity-40 transition-opacity"
        >
          {submitting ? t.logging : t.log}
        </button>

        {feedback && (
          <p className={`text-sm ${feedback.ok ? "text-moss-400" : "text-rust-400"}`}>{feedback.text}</p>
        )}
      </div>
    </div>
  );
}
