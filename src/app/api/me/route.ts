import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { buildUserSummary } from "@/lib/summary";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await buildUserSummary(user);

  return NextResponse.json({
    user: {
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      language: user.language,
      salaryAmount: user.salaryAmount,
      salarySplit: user.salarySplit,
      payday1: user.payday1,
      payday2: user.payday2,
      eodNagEnabled: user.eodNagEnabled,
    },
    summary,
  });
}
