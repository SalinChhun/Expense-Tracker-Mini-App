import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.salaryAmount !== undefined) {
    const v = Number(body.salaryAmount);
    if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: "Invalid salary amount" }, { status: 400 });
    data.salaryAmount = v;
  }
  if (body.salarySplit !== undefined) {
    const v = Number(body.salarySplit);
    if (![1, 2].includes(v)) return NextResponse.json({ error: "salarySplit must be 1 or 2" }, { status: 400 });
    data.salarySplit = v;
  }
  if (body.payday1 !== undefined) {
    const v = Number(body.payday1);
    if (v < 1 || v > 31) return NextResponse.json({ error: "Invalid payday1" }, { status: 400 });
    data.payday1 = v;
  }
  if (body.payday2 !== undefined) {
    const v = Number(body.payday2);
    if (v < 1 || v > 31) return NextResponse.json({ error: "Invalid payday2" }, { status: 400 });
    data.payday2 = v;
  }
  if (body.language !== undefined && ["en", "kh"].includes(body.language)) {
    data.language = body.language;
  }
  if (body.eodNagEnabled !== undefined) {
    data.eodNagEnabled = Boolean(body.eodNagEnabled);
  }
  if (body.reminderHourBreakfast !== undefined) data.reminderHourBreakfast = Number(body.reminderHourBreakfast);
  if (body.reminderHourLunch !== undefined) data.reminderHourLunch = Number(body.reminderHourLunch);
  if (body.reminderHourDinner !== undefined) data.reminderHourDinner = Number(body.reminderHourDinner);

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({
    ok: true,
    user: { ...updated, telegramId: updated.telegramId.toString() },
  });
}
