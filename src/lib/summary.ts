import { prisma } from "./db";
import { getPayPeriod } from "./payPeriod";
import type { User } from "@prisma/client";

export async function buildUserSummary(user: User) {
  const today = new Date();
  const period = getPayPeriod(today, user.payday1, user.payday2, user.salarySplit);

  const categories = await prisma.category.findMany({
    where: { userId: user.id, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });

  const expensesInPeriod = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { userId: user.id, spentAt: { gte: period.start, lte: period.end } },
    _sum: { amount: true },
  });
  const spentByCategory = new Map(expensesInPeriod.map((e) => [e.categoryId, e._sum.amount ?? 0]));

  const categoriesWithSpend = categories.map((c) => {
    const spent = spentByCategory.get(c.id) ?? 0;
    return {
      ...c,
      spent,
      remaining: c.budget - spent,
      overBudget: c.budget > 0 && spent > c.budget,
    };
  });

  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = categoriesWithSpend.reduce((sum, c) => sum + c.spent, 0);
  // salaryAmount is already "per payment" — one payment funds exactly one pay period,
  // whether the user is paid once or twice a month.
  const salaryThisPeriod = user.salaryAmount;
  const remainingCash = salaryThisPeriod - totalSpent;
  const safeDailySpend = period.daysRemaining > 0 ? Math.max(remainingCash, 0) / period.daysRemaining : 0;

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const todaySpentAgg = await prisma.expense.aggregate({
    where: { userId: user.id, spentAt: { gte: todayStart, lte: todayEnd } },
    _sum: { amount: true },
  });

  return {
    period,
    categories: categoriesWithSpend,
    totals: {
      budget: totalBudget,
      spent: totalSpent,
      salary: salaryThisPeriod,
      remainingCash,
      safeDailySpend,
      todaySpent: todaySpentAgg._sum.amount ?? 0,
    },
  };
}
