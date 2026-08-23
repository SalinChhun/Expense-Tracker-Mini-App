import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.expense.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    const body = await req.json();
    const data: { amount?: number; note?: string | null; categoryId?: string; spentAt?: Date } = {};

    if (body.amount !== undefined) {
        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }
        data.amount = amount;
    }
    if (body.note !== undefined) {
        data.note = typeof body.note === "string" ? body.note.slice(0, 200) : null;
    }
    if (body.categoryId !== undefined) {
        const cat = await prisma.category.findFirst({ where: { id: body.categoryId, userId: user.id } });
        if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
        data.categoryId = body.categoryId;
    }
    if (typeof body.spentAt === "string" && body.spentAt) {
        // Accepts "YYYY-MM-DD" from a date picker. Preserve the original time-of-day
        // when only the date changed, otherwise defaults to midnight for a new date.
        const picked = new Date(`${body.spentAt}T00:00:00`);
        if (Number.isNaN(picked.getTime())) {
            return NextResponse.json({ error: "Invalid date" }, { status: 400 });
        }
        if (picked.getTime() > Date.now()) {
            return NextResponse.json({ error: "Date cannot be in the future" }, { status: 400 });
        }
        const original = new Date(existing.spentAt);
        picked.setHours(original.getHours(), original.getMinutes(), original.getSeconds());
        data.spentAt = picked;
    }

    const updated = await prisma.expense.update({ where: { id: params.id }, data });
    return NextResponse.json({ ok: true, expense: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.expense.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    await prisma.expense.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
}