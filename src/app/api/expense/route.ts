import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const amount = Number(body.amount);
  const categoryId = String(body.categoryId ?? "");
  const note = typeof body.note === "string" ? body.note.slice(0, 200) : null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId: user.id } });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const expense = await prisma.expense.create({
    data: { userId: user.id, categoryId, amount, note, spentAt: new Date() },
  });

  return NextResponse.json({ ok: true, expense });
}

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  const expenses = await prisma.expense.findMany({
    where: { userId: user.id },
    orderBy: { spentAt: "desc" },
    take: limit,
    include: { category: true },
  });

  return NextResponse.json({ expenses });
}
