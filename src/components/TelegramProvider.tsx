"use client";

import Script from "next/script";
import { createContext, useContext, useEffect, useState } from "react";

type TgWebApp = {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string; username?: string; language_code?: string } };
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  themeParams: Record<string, string>;
  HapticFeedback?: { impactOccurred: (style: string) => void; notificationOccurred: (type: string) => void };
};

declare global {
  interface Window {
    Telegram?: { WebApp: TgWebApp };
  }
}

type Ctx = {
  ready: boolean;
  initData: string;
  firstName?: string;
  haptic: (style?: "light" | "medium" | "heavy") => void;
};

const TelegramContext = createContext<Ctx>({ ready: false, initData: "", haptic: () => {} });

export function useTelegram() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [initData, setInitData] = useState("");
  const [firstName, setFirstName] = useState<string | undefined>();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return; // running outside Telegram (e.g. local dev in a browser)
    tg.ready();
    tg.expand();
    try {
      tg.setBackgroundColor("#0B1614");
      tg.setHeaderColor("#0B1614");
    } catch {
      /* older client versions may not support this */
    }
    setInitData(tg.initData);
    setFirstName(tg.initDataUnsafe?.user?.first_name);
    setReady(true);
  }, []);

  const haptic = (style: "light" | "medium" | "heavy" = "light") => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  };

  return (
    <TelegramContext.Provider value={{ ready, initData, firstName, haptic }}>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {children}
    </TelegramContext.Provider>
  );
}
