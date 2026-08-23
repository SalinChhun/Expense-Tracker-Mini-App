import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.expense.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    const body = await req.json();
    const data: { amount?: number; note?: string | null; categoryId?: string } = {};

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