// Computes the current pay-period window from a user's payday(s), so budgets
// reset when the user actually gets paid rather than on the calendar month.
// e.g. paydays on 25th and 10th -> periods are [25th -> 9th] and [10th -> 24th].

function lastDayOfMonth(year: number, month0: number): number {
  // month0 is 0-indexed (JS Date convention)
  return new Date(year, month0 + 1, 0).getDate();
}

function clampedDate(year: number, month0: number, day: number): Date {
  const last = lastDayOfMonth(year, month0);
  return new Date(year, month0, Math.min(day, last));
}

export type PayPeriod = {
  start: Date;
  end: Date; // inclusive
  nextPayday: Date;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
};

export function getPayPeriod(today: Date, payday1: number, payday2: number, salarySplit: number): PayPeriod {
  const paydays = salarySplit === 1 ? [payday1] : [payday1, payday2].sort((a, b) => a - b);

  const candidates: Date[] = [];
  for (const mOffset of [-1, 0, 1]) {
    const d = new Date(today.getFullYear(), today.getMonth() + mOffset, 1);
    for (const day of paydays) {
      candidates.push(clampedDate(d.getFullYear(), d.getMonth(), day));
    }
  }
  candidates.sort((a, b) => a.getTime() - b.getTime());

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const past = candidates.filter((c) => c.getTime() <= todayMidnight.getTime());
  const future = candidates.filter((c) => c.getTime() > todayMidnight.getTime());

  const start = past.length ? past[past.length - 1] : candidates[0];
  const nextPayday = future.length ? future[0] : candidates[candidates.length - 1];
  const end = new Date(nextPayday);
  end.setDate(end.getDate() - 1);

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysTotal = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  const daysElapsed = Math.round((todayMidnight.getTime() - start.getTime()) / msPerDay) + 1;
  const daysRemaining = Math.max(daysTotal - daysElapsed, 0);

  return { start, end, nextPayday, daysTotal, daysElapsed, daysRemaining };
}

export function toDayStartISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
}

export function toDayEndISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
}
