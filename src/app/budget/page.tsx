"use client";

import { useState } from "react";
import { useMe } from "@/lib/useMe";
import { apiFetch } from "@/lib/apiClient";
import { CATEGORY_ICON } from "@/lib/categories";
import { useTelegram } from "@/components/TelegramProvider";

export default function BudgetPage() {
  const { data, loading, reload } = useMe();
  const { initData } = useTelegram();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading || !data) return <div className="text-paper-400 text-sm py-10 text-center">Loading…</div>;
  const lang = data.user.language;
  const t = {
    title: lang === "kh" ? "ថវិកា" : "Budgets",
    subtitle: lang === "kh" ? "ថវិកាកំណត់ក្នុងមួយជុំបើកប្រាក់" : "Budgets are per pay period",
    save: lang === "kh" ? "រក្សាទុក" : "Save",
    cancel: lang === "kh" ? "បោះបង់" : "Cancel",
    addCategory: lang === "kh" ? "+ បន្ថែមប្រភេទ" : "+ Add category",
    namePlaceholder: lang === "kh" ? "ឈ្មោះប្រភេទ" : "Category name",
    budgetPlaceholder: lang === "kh" ? "ថវិកា ($)" : "Budget ($)",
    dueDay: lang === "kh" ? "ត្រូវបង់ថ្ងៃទី" : "Due on day",
  };

  async function saveBudget(id: string) {
    const value = Number(draft);
    if (!Number.isFinite(value) || value < 0) return;
    setSaving(true);
    try {
      await apiFetch("/api/category", initData, {
        method: "PATCH",
        body: JSON.stringify({ id, budget: value }),
      });
      setEditing(null);
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function addCategory() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/category", initData, {
        method: "POST",
        body: JSON.stringify({ nameEn: newName.trim(), budget: Number(newBudget) || 0 }),
      });
      setNewName("");
      setNewBudget("");
      setAddingNew(false);
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl text-paper-50">{t.title}</h1>
        <p className="text-paper-400 text-sm mt-0.5">{t.subtitle}</p>
      </header>

      <div className="space-y-2">
        {data.summary.categories.map((cat) => {
          const name = lang === "kh" ? cat.nameKh : cat.nameEn;
          const isEditing = editing === cat.id;
          return (
            <div key={cat.id} className="card p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_ICON[cat.key] ?? "🗂️"}</span>
                  <div>
                    <p className="text-paper-50 text-sm">{name}</p>
                    {cat.fixedDay && (
                      <p className="text-paper-400 text-[11px]">{t.dueDay} {cat.fixedDay}</p>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="figure w-20 bg-ink-800 border border-brass-400 rounded px-2 py-1 text-sm text-paper-50 outline-none"
                    />
                    <button onClick={() => saveBudget(cat.id)} disabled={saving} className="text-brass-400 text-xs px-1">✓</button>
                    <button onClick={() => setEditing(null)} className="text-paper-400 text-xs px-1">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditing(cat.id); setDraft(String(cat.budget)); }}
                    className="figure text-sm text-paper-200"
                  >
                    ${cat.budget.toFixed(2)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {addingNew ? (
        <div className="card p-3.5 space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="w-full bg-ink-800 border border-ink-700 rounded-card px-3 py-2 text-sm text-paper-50 outline-none focus:border-brass-400"
          />
          <input
            type="number"
            inputMode="decimal"
            value={newBudget}
            onChange={(e) => setNewBudget(e.target.value)}
            placeholder={t.budgetPlaceholder}
            className="figure w-full bg-ink-800 border border-ink-700 rounded-card px-3 py-2 text-sm text-paper-50 outline-none focus:border-brass-400"
          />
          <div className="flex gap-2">
            <button onClick={addCategory} disabled={saving} className="flex-1 py-2 rounded-card bg-brass-500 text-ink-950 text-sm font-medium">{t.save}</button>
            <button onClick={() => setAddingNew(false)} className="flex-1 py-2 rounded-card border border-ink-700 text-paper-200 text-sm">{t.cancel}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingNew(true)} className="w-full py-3 rounded-card border border-dashed border-ink-700 text-paper-400 text-sm">
          {t.addCategory}
        </button>
      )}
    </div>
  );
}
