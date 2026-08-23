"use client";

import { useState } from "react";
import { useMe } from "@/lib/useMe";
import { apiFetch } from "@/lib/apiClient";
import { useTelegram } from "@/components/TelegramProvider";

export default function SettingsPage() {
  const { data, loading, reload } = useMe();
  const { initData } = useTelegram();
  const [saving, setSaving] = useState(false);

  if (loading || !data) return <div className="text-paper-400 text-sm py-10 text-center">Loading…</div>;
  const lang = data.user.language;
  const t = {
    title: lang === "kh" ? "ការកំណត់" : "Settings",
    language: lang === "kh" ? "ភាសា" : "Language",
    eodNag: lang === "kh" ? "រំលឹកពេលល្ងាចប្រសិនបើមិនទាន់កត់ត្រា" : "Remind me at night if I haven't logged anything",
    mealTimes: lang === "kh" ? "ម៉ោងរំលឹកអាហារ" : "Meal reminder times",
    breakfast: lang === "kh" ? "ពេលព្រឹក" : "Breakfast",
    lunchLabel: lang === "kh" ? "ពេលថ្ងៃត្រង់" : "Lunch",
    dinner: lang === "kh" ? "ពេលល្ងាច" : "Dinner",
    note: lang === "kh"
      ? "ម៉ោងរំលឹកត្រូវបានកំណត់ជាសកលសម្រាប់អ្នកប្រើប្រាស់ទាំងអស់ (កំណត់ដោយម្ចាស់ bot)"
      : "Reminder times are currently set globally by the bot owner via cron schedule.",
  };

  async function setLanguage(newLang: "en" | "kh") {
    setSaving(true);
    try {
      await apiFetch("/api/salary", initData, {
        method: "PATCH",
        body: JSON.stringify({ language: newLang }),
      });
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function toggleNag() {
    if (!data) return;
    setSaving(true);
    try {
      await apiFetch("/api/salary", initData, {
        method: "PATCH",
        body: JSON.stringify({ eodNagEnabled: !data.user.eodNagEnabled }),
      });
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl text-paper-50">{t.title}</h1>

      <div className="card p-4">
        <p className="text-paper-400 text-xs uppercase tracking-wide mb-2">{t.language}</p>
        <div className="flex gap-2">
          <button
            disabled={saving}
            onClick={() => setLanguage("en")}
            className={`flex-1 py-2 rounded-card text-sm border ${lang === "en" ? "border-brass-400 bg-ink-800 text-brass-400" : "border-ink-700 text-paper-200"}`}
          >English</button>
          <button
            disabled={saving}
            onClick={() => setLanguage("kh")}
            className={`flex-1 py-2 rounded-card text-sm border ${lang === "kh" ? "border-brass-400 bg-ink-800 text-brass-400" : "border-ink-700 text-paper-200"}`}
          >ខ្មែរ</button>
        </div>
      </div>

      <div className="card p-4 flex items-center justify-between">
        <p className="text-paper-50 text-sm pr-3">{t.eodNag}</p>
        <button
          onClick={toggleNag}
          disabled={saving}
          className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${data.user.eodNagEnabled ? "bg-brass-500 justify-end" : "bg-ink-700 justify-start"}`}
        >
          <span className="w-5 h-5 rounded-full bg-ink-950" />
        </button>
      </div>

      <div className="card p-4">
        <p className="text-paper-400 text-xs uppercase tracking-wide mb-2">{t.mealTimes}</p>
        <div className="text-sm text-paper-200 space-y-1 figure">
          <div className="flex justify-between"><span className="font-body text-paper-400">{t.breakfast}</span><span>07:00</span></div>
          <div className="flex justify-between"><span className="font-body text-paper-400">{t.lunchLabel}</span><span>12:00</span></div>
          <div className="flex justify-between"><span className="font-body text-paper-400">{t.dinner}</span><span>18:00</span></div>
        </div>
        <p className="text-paper-400 text-[11px] mt-3">{t.note}</p>
      </div>
    </div>
  );
}
