import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { userId: user.id, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ categories });
}

// Update an existing category's budget / fixed due day
export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const id = String(body.id ?? "");
  const data: { budget?: number; fixedDay?: number | null; nameEn?: string; nameKh?: string } = {};

  if (body.budget !== undefined) {
    const budget = Number(body.budget);
    if (!Number.isFinite(budget) || budget < 0) {
      return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
    }
    data.budget = budget;
  }
  if (body.fixedDay !== undefined) {
    data.fixedDay = body.fixedDay === null ? null : Math.min(Math.max(Number(body.fixedDay), 1), 31);
  }
  if (typeof body.nameEn === "string") data.nameEn = body.nameEn.slice(0, 60);
  if (typeof body.nameKh === "string") data.nameKh = body.nameKh.slice(0, 60);

  const category = await prisma.category.findFirst({ where: { id, userId: user.id } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const updated = await prisma.category.update({ where: { id }, data });
  return NextResponse.json({ ok: true, category: updated });
}

// Add a custom category
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const nameEn = String(body.nameEn ?? "").slice(0, 60);
  const nameKh = String(body.nameKh ?? nameEn).slice(0, 60);
  const budget = Number(body.budget ?? 0);
  if (!nameEn) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const key = `custom-${nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${Date.now().toString(36)}`;
  const maxSort = await prisma.category.aggregate({
    where: { userId: user.id },
    _max: { sortOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      userId: user.id,
      key,
      nameEn,
      nameKh,
      budget: Number.isFinite(budget) ? budget : 0,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json({ ok: true, category });
}
