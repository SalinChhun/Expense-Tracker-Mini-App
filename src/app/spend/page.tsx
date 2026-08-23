"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "@/lib/useMe";
import { apiFetch } from "@/lib/apiClient";
import { CATEGORY_ICON } from "@/lib/categories";
import { useTelegram } from "@/components/TelegramProvider";

type ExpenseItem = {
  id: string;
  amount: number;
  note: string | null;
  spentAt: string;
  category: { id: string; nameEn: string; nameKh: string; key: string };
};

type Range = "month" | "all";

export default function SpendPage() {
  const { data, loading, reload } = useMe();
  const { initData, haptic } = useTelegram();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [range, setRange] = useState<Range>("month");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef(range); // avoids stale closures inside the observer callback
  rangeRef.current = range;

  // Reset + load the first page whenever the range filter changes (or on first auth)
  const loadFirstPage = useCallback(async (activeRange: Range) => {
    if (!initData) return;
    setListLoading(true);
    try {
      const res = await apiFetch<{ expenses: ExpenseItem[]; nextCursor: string | null; hasMore: boolean }>(
          `/api/expense?limit=15&range=${activeRange}`,
          initData
      );
      setExpenses(res.expenses);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
      /* silent — recent list is non-critical */
    } finally {
      setListLoading(false);
    }
  }, [initData]);

  const loadMore = useCallback(async () => {
    if (!initData || !cursor || listLoading) return;
    setListLoading(true);
    try {
      const res = await apiFetch<{ expenses: ExpenseItem[]; nextCursor: string | null; hasMore: boolean }>(
          `/api/expense?limit=15&range=${rangeRef.current}&cursor=${cursor}`,
          initData
      );
      setExpenses((prev) => [...prev, ...res.expenses]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
      /* silent */
    } finally {
      setListLoading(false);
    }
  }, [initData, cursor, listLoading]);

  useEffect(() => {
    loadFirstPage(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData, range]);

  // Infinite scroll: observe a sentinel div at the bottom of the list
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !listLoading) {
            loadMore();
          }
        },
        { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, listLoading, loadMore]);

  if (loading || !data) return <div className="text-paper-400 text-sm py-10 text-center">Loading…</div>;
  const lang = data.user.language;
  const t = {
    title: lang === "kh" ? "កត់ត្រាចំណាយ" : "Log an expense",
    chooseCategory: lang === "kh" ? "ជ្រើសរើសប្រភេទ" : "Choose a category",
    amount: lang === "kh" ? "ចំនួនទឹកប្រាក់ ($)" : "Amount ($)",
    note: lang === "kh" ? "កំណត់ចំណាំ (ស្រេចចិត្ត)" : "Note (optional)",
    log: lang === "kh" ? "កត់ត្រា" : "Log expense",
    logging: lang === "kh" ? "កំពុងកត់ត្រា…" : "Logging…",
    recent: lang === "kh" ? "ចំណាយថ្មីៗ" : "Recent",
    noExpenses: lang === "kh" ? "មិនទាន់មានចំណាយទេ" : "No expenses logged yet",
    save: lang === "kh" ? "រក្សាទុក" : "Save",
    cancel: lang === "kh" ? "បោះបង់" : "Cancel",
    notePlaceholder: lang === "kh" ? "កំណត់ចំណាំ" : "Note",
    thisMonth: lang === "kh" ? "ខែនេះ" : "This month",
    all: lang === "kh" ? "ទាំងអស់" : "All",
    endOfList: lang === "kh" ? "គ្មានទៀតទេ" : "That's everything",
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
      loadFirstPage(range);
    } catch (e) {
      setFeedback({ ok: false, text: e instanceof Error ? e.message : "Failed to log expense." });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item: ExpenseItem) {
    setEditingId(item.id);
    setEditAmount(String(item.amount));
    setEditNote(item.note ?? "");
  }

  async function saveEdit(id: string) {
    const value = Number(editAmount);
    if (!Number.isFinite(value) || value <= 0) return;
    await apiFetch(`/api/expense/${id}`, initData, {
      method: "PATCH",
      body: JSON.stringify({ amount: value, note: editNote || null }),
    });
    setEditingId(null);
    await loadFirstPage(range);
    reload();
  }

  async function deleteExpense(id: string) {
    await apiFetch(`/api/expense/${id}`, initData, { method: "DELETE" });
    await loadFirstPage(range);
    reload();
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-paper-400 text-xs uppercase tracking-wide">{t.recent}</p>
            <div className="flex gap-1 bg-ink-800 rounded-full p-0.5 border border-ink-700">
              <button
                  onClick={() => setRange("month")}
                  className={`px-3 py-1 rounded-full text-[11px] transition-colors ${
                      range === "month" ? "bg-brass-500 text-ink-950" : "text-paper-400"
                  }`}
              >
                {t.thisMonth}
              </button>
              <button
                  onClick={() => setRange("all")}
                  className={`px-3 py-1 rounded-full text-[11px] transition-colors ${
                      range === "all" ? "bg-brass-500 text-ink-950" : "text-paper-400"
                  }`}
              >
                {t.all}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {expenses.map((item) => {
              const name = lang === "kh" ? item.category.nameKh : item.category.nameEn;
              const isEditing = editingId === item.id;
              return (
                  <div key={item.id} className="card p-3">
                    {isEditing ? (
                        <div className="space-y-2">
                          <input
                              type="number"
                              inputMode="decimal"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="figure w-full bg-ink-800 border border-brass-400 rounded px-2 py-1.5 text-sm text-paper-50 outline-none"
                          />
                          <input
                              type="text"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              placeholder={t.notePlaceholder}
                              className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1.5 text-sm text-paper-50 outline-none focus:border-brass-400"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(item.id)} className="flex-1 py-1.5 rounded bg-brass-500 text-ink-950 text-xs font-medium">
                              {t.save}
                            </button>
                            <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 rounded border border-ink-700 text-paper-200 text-xs">
                              {t.cancel}
                            </button>
                            <button onClick={() => deleteExpense(item.id)} className="px-3 py-1.5 rounded border border-rust-500 text-rust-400 text-xs">
                              🗑
                            </button>
                          </div>
                        </div>
                    ) : (
                        <button onClick={() => startEdit(item)} className="w-full flex items-center justify-between text-left">
                          <div className="flex items-center gap-2 min-w-0">
                            <span>{CATEGORY_ICON[item.category.key] ?? "🗂️"}</span>
                            <div className="min-w-0">
                              <p className="text-paper-50 text-sm truncate">{name}</p>
                              {item.note && <p className="text-paper-400 text-[11px] truncate">{item.note}</p>}
                            </div>
                          </div>
                          <span className="figure text-sm text-paper-200 shrink-0 ml-2">${item.amount.toFixed(2)}</span>
                        </button>
                    )}
                  </div>
              );
            })}

            {expenses.length === 0 && !listLoading && (
                <p className="text-paper-400 text-sm text-center py-4">{t.noExpenses}</p>
            )}

            {/* Infinite scroll trigger — loads the next page when it enters the viewport */}
            <div ref={sentinelRef} />

            {listLoading && (
                <p className="text-paper-400 text-xs text-center py-2">…</p>
            )}
            {!hasMore && expenses.length > 0 && (
                <p className="text-paper-400 text-[11px] text-center py-2">{t.endOfList}</p>
            )}
          </div>
        </div>
      </div>
  );
}