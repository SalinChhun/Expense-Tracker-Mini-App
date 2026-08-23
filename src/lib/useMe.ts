"use client";

import { useCallback, useEffect, useState } from "react";
import { useTelegram } from "@/components/TelegramProvider";
import { apiFetch } from "@/lib/apiClient";

export type Category = {
  id: string;
  key: string;
  nameEn: string;
  nameKh: string;
  budget: number;
  fixedDay: number | null;
  spent: number;
  remaining: number;
  overBudget: boolean;
};

export type MeResponse = {
  user: {
    id: string;
    telegramId: string;
    username?: string;
    firstName?: string;
    language: "en" | "kh";
    salaryAmount: number;
    salarySplit: number;
    payday1: number;
    payday2: number;
    eodNagEnabled: boolean;
  };
  summary: {
    period: { start: string; end: string; nextPayday: string; daysTotal: number; daysElapsed: number; daysRemaining: number };
    categories: Category[];
    totals: {
      budget: number;
      spent: number;
      salary: number;
      remainingCash: number;
      safeDailySpend: number;
      todaySpent: number;
    };
  };
};

export function useMe() {
  const { ready, initData } = useTelegram();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!initData) return;
    setLoading(true);
    try {
      const res = await apiFetch<MeResponse>("/api/me", initData);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [initData]);

  useEffect(() => {
    if (ready && initData) reload();
  }, [ready, initData, reload]);

  return { data, loading, error, reload, initData, ready };
}
