"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";
import { apiFetch } from "@/lib/apiClient";
import { useTelegram } from "@/components/TelegramProvider";

export default function SalaryPage() {
  const { data, loading, reload } = useMe();
  const { initData } = useTelegram();
  const [amount, setAmount] = useState("");
  const [split, setSplit] = useState<1 | 2>(2);
  const [payday1, setPayday1] = useState("25");
  const [payday2, setPayday2] = useState("10");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAmount(String(data.user.salaryAmount));
    setSplit(data.user.salarySplit === 1 ? 1 : 2);
    setPayday1(String(data.user.payday1));
    setPayday2(String(data.user.payday2));
  }, [data]);

  if (loading || !data) return <div className="text-paper-400 text-sm py-10 text-center">Loading…</div>;
  const lang = data.user.language;
  const t = {
    title: lang === "kh" ? "ប្រាក់ខែ" : "Salary",
    amount: lang === "kh" ? "ចំនួនប្រាក់ក្នុងមួយដង ($)" : "Amount per payment ($)",
    frequency: lang === "kh" ? "ភាពញឹកញាប់" : "Frequency",
    once: lang === "kh" ? "ម្តងក្នុងមួយខែ" : "Once a month",
    twice: lang === "kh" ? "ពីរដងក្នុងមួយខែ" : "Twice a month",
    payday1: lang === "kh" ? "ថ្ងៃបើកប្រាក់ទី១" : "Payday 1 (day of month)",
    payday2: lang === "kh" ? "ថ្ងៃបើកប្រាក់ទី២" : "Payday 2 (day of month)",
    total: lang === "kh" ? "ចំណូលសរុបប្រចាំខែ" : "Total monthly income",
    save: lang === "kh" ? "រក្សាទុក" : "Save changes",
    savedMsg: lang === "kh" ? "✅ បានរក្សាទុក" : "✅ Saved",
  };

  const monthlyTotal = Number(amount || 0) * split;

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await apiFetch("/api/salary", initData, {
        method: "PATCH",
        body: JSON.stringify({
          salaryAmount: Number(amount),
          salarySplit: split,
          payday1: Number(payday1),
          payday2: Number(payday2),
        }),
      });
      setSaved(true);
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl text-paper-50">{t.title}</h1>

      <div className="card p-4 space-y-4">
        <div>
          <label className="text-paper-400 text-xs uppercase tracking-wide">{t.amount}</label>
          <input
            type="number" inputMode="decimal" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="figure w-full mt-1 bg-ink-800 border border-ink-700 rounded-card px-3 py-2.5 text-lg text-paper-50 outline-none focus:border-brass-400"
          />
        </div>

        <div>
          <label className="text-paper-400 text-xs uppercase tracking-wide">{t.frequency}</label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setSplit(1)}
              className={`flex-1 py-2 rounded-card text-sm border ${split === 1 ? "border-brass-400 bg-ink-800 text-brass-400" : "border-ink-700 text-paper-200"}`}
            >{t.once}</button>
            <button
              onClick={() => setSplit(2)}
              className={`flex-1 py-2 rounded-card text-sm border ${split === 2 ? "border-brass-400 bg-ink-800 text-brass-400" : "border-ink-700 text-paper-200"}`}
            >{t.twice}</button>
          </div>
        </div>

        <div className={`grid ${split === 2 ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
          <div>
            <label className="text-paper-400 text-xs uppercase tracking-wide">{t.payday1}</label>
            <input
              type="number" min={1} max={31} value={payday1}
              onChange={(e) => setPayday1(e.target.value)}
              className="figure w-full mt-1 bg-ink-800 border border-ink-700 rounded-card px-3 py-2.5 text-sm text-paper-50 outline-none focus:border-brass-400"
            />
          </div>
          {split === 2 && (
            <div>
              <label className="text-paper-400 text-xs uppercase tracking-wide">{t.payday2}</label>
              <input
                type="number" min={1} max={31} value={payday2}
                onChange={(e) => setPayday2(e.target.value)}
                className="figure w-full mt-1 bg-ink-800 border border-ink-700 rounded-card px-3 py-2.5 text-sm text-paper-50 outline-none focus:border-brass-400"
              />
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-ink-700 flex justify-between items-baseline">
          <span className="text-paper-400 text-xs">{t.total}</span>
          <span className="figure text-lg text-brass-400">${monthlyTotal.toFixed(2)}</span>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full py-3 rounded-card bg-brass-500 text-ink-950 font-medium disabled:opacity-40">
        {saving ? "…" : t.save}
      </button>
      {saved && <p className="text-moss-400 text-sm text-center">{t.savedMsg}</p>}
    </div>
  );
}
