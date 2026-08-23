# Ledger — Telegram Expense Tracker Mini App

Next.js 14 (App Router) + Prisma + Postgres, deployed on Vercel. A Telegram bot
registers users and opens a Mini App (an in-Telegram web view) for logging
expenses, setting budgets, salary, and reminders.

## How it fits together

```
Telegram user
   │
   ├─ sends /start ──────────────► POST /api/bot/webhook   (registers user, replies
   │                                                          with a button that opens
   │                                                          the Mini App)
   │
   └─ taps "Open Expense Tracker" ► Mini App (Next.js pages, rendered inside
                                      Telegram's webview)
                                      │
                                      └─ every fetch() sends Telegram's signed
                                         `initData` in a header → verified
                                         server-side in /api/* routes → identifies
                                         the user without any separate login

Vercel Cron ──► /api/cron/meal-reminder (breakfast/lunch/dinner)
            ──► /api/cron/eod-nag        (nightly, only if nothing logged today)
            ──► /api/cron/bill-due       (fixed bills, e.g. rent on the 10th)
```

## 1. Prerequisites

- Node.js 18+
- A Postgres database — easiest is **Vercel Postgres** or **Neon** (Neon is what
  Vercel Postgres uses under the hood; either works, and Neon's free tier is fine
  for personal use)
- A Telegram bot token from **[@BotFather](https://t.me/BotFather)**

## 2. Create your bot with BotFather

1. Message `@BotFather` → `/newbot` → follow the prompts → copy the token.
2. `/setmenubutton` → select your bot → send your Mini App URL (you'll have this
   after deploying in step 4) and a label like "Open Ledger". This makes the
   Mini App accessible from the persistent menu button, in addition to the
   button the bot sends on `/start`.
3. Optional: `/setcommands` → paste:
   ```
   start - Open your expense tracker
   help - How to use this bot
   ```

## 3. Local setup

```bash
npm install
cp .env .env      # fill in DATABASE_URL / DIRECT_URL / TELEGRAM_BOT_TOKEN etc.
npx prisma migrate dev --name init
npm run dev
```

You can't fully test the Mini App in a regular browser (Telegram's `initData`
won't exist), but you can sanity-check pages render. Real testing needs to
happen inside Telegram — see step 6.

## 4. Deploy to Vercel

1. Push this repo to GitHub, then **Import Project** into Vercel.
2. Add a Postgres database from the Vercel **Storage** tab (or paste in a Neon
   connection string manually) — this sets `DATABASE_URL`/`DIRECT_URL` for you,
   or set them yourself from `.env.example`.
3. In **Project Settings → Environment Variables**, add:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET` (any long random string you invent)
   - `MINI_APP_URL` → your Vercel deployment URL, e.g. `https://your-app.vercel.app`
   - `CRON_SECRET` (any long random string you invent — Vercel automatically
     sends it as a Bearer token to your cron routes once this is set)
4. Deploy.
5. Apply the database schema to production:
   ```bash
   vercel env pull .env.production.local
   npx prisma migrate deploy
   ```

## 5. Point Telegram at your deployed webhook

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.vercel.app/api/bot/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
  }'
```

Check it worked:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## 6. Test it

Open your bot in Telegram, send `/start`. You should get a welcome message with
an **Open Expense Tracker** button. Tapping it opens the Mini App with your
default categories already seeded from your original numbers (Housing $60,
Personal Care $25.50, Food $165, Entertainment $20, plus empty Transport and
Miscellaneous for anything you missed).

## 7. About the cron reminders (important — read this)

`vercel.json` schedules 5 cron jobs (3 meal reminders + nightly nag + bill-due
check), assuming `Asia/Phnom_Penh` (UTC+7) — the UTC times are commented in
`vercel.json`. Change the UTC hours there if you're in a different timezone.

**Caveat:** Vercel's **Hobby (free) plan currently limits cron jobs to once per
day per job**, but allows multiple *separate* cron jobs — which is exactly what
we've set up (5 distinct jobs, each running once a day), so this should work
fine on Hobby. If Vercel changes this limit or you need finer control, two
easy fallbacks:
- Use a free external scheduler like **cron-job.org** or **GitHub Actions**
  (`schedule:` in a workflow) to `curl` your `/api/cron/*` routes directly,
  passing `Authorization: Bearer <CRON_SECRET>`.
- Upgrade to Vercel Pro, which allows more frequent schedules.

## 8. Project structure

```
prisma/schema.prisma        User, Category, Expense models
src/lib/
  db.ts                     Prisma client singleton
  telegram.ts               sendMessage() + initData signature verification
  auth.ts                   getAuthedUser() — verifies initData, creates user on first visit
  payPeriod.ts               pay-period (payday-to-payday) date math
  summary.ts                 builds the dashboard summary (spend vs budget, safe daily spend)
  categories.ts               default categories seeded for new users
src/app/
  api/bot/webhook/route.ts   Telegram bot webhook (/start registration)
  api/me/route.ts             GET current user + dashboard summary
  api/expense/route.ts        POST log expense, GET recent expenses
  api/category/route.ts       GET/PATCH/POST budgets & custom categories
  api/salary/route.ts         PATCH salary, paydays, language, settings
  api/cron/*/route.ts         reminder jobs, called by Vercel Cron
  page.tsx                    dashboard ("Ledger")
  spend/page.tsx               log an expense
  budget/page.tsx              view/edit budgets, add categories
  salary/page.tsx              salary amount, split, paydays
  settings/page.tsx            language, night reminder toggle
src/components/
  TelegramProvider.tsx         loads Telegram Web App SDK, exposes initData
  BottomNav.tsx                 in-app navigation
```

## 9. Extending

- **Per-user reminder times / timezone:** the schema already has
  `reminderHourBreakfast/Lunch/Dinner` on `User` for this — the cron routes
  currently broadcast to everyone at fixed UTC times; wiring per-user times
  means switching from a broadcast cron to checking each user's local hour
  (needs a `timezone` field added to `User`).
- **Charts / monthly reports:** add a `/report` page using `recharts` against
  `/api/expense` history.
- **Recurring/auto-logged bills:** a cron job that auto-inserts an `Expense`
  for `Housing` on its `fixedDay` instead of just reminding.
- **CSV export:** an API route streaming a user's `Expense` rows as CSV.
