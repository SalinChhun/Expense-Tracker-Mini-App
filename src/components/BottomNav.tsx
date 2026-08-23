"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Ledger", icon: "📒" },
  { href: "/spend", label: "Spend", icon: "✍️" },
  { href: "/budget", label: "Budget", icon: "🎯" },
  { href: "/salary", label: "Salary", icon: "💵" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-ink-900 border-t border-ink-700 z-10">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition-colors ${
                active ? "text-brass-400" : "text-paper-400"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
