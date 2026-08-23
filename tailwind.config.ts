import type { Config } from "tailwindcss";

// --- Design tokens: "digital ledger / passbook" direction -----------------
// Ink-teal ground, warm brass accent, tabular-numeral money figures.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1614", // page background
          900: "#101F1C", // card background
          800: "#17302B", // raised card / input
          700: "#22423B", // borders / dividers
          600: "#33584E",
        },
        paper: {
          50: "#F6F2E9",  // primary text on dark
          200: "#DCD4BE", // secondary text
          400: "#9C9481", // muted text
        },
        brass: {
          400: "#D8B26A", // accent - positive / highlight
          500: "#C79A47",
          600: "#A97F35",
        },
        rust: {
          400: "#D97757", // over-budget warning (used sparingly)
          500: "#C05F42",
        },
        moss: {
          400: "#7FA07A", // under-budget / good state
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        ledger: "0 1px 0 0 rgba(216,178,106,0.15) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
