import { NextRequest } from "next/server";
import { prisma } from "./db";
import { verifyInitData } from "./telegram";
import { DEFAULT_CATEGORIES } from "./categories";

/**
 * Reads Telegram's `initData` from the request (sent as a header by the
 * client on every fetch — see components/TelegramProvider.tsx), verifies
 * its signature, and returns the corresponding DB user (creating it with
 * default categories on first visit if needed).
 */
export async function getAuthedUser(req: NextRequest) {
  const initData = req.headers.get("x-telegram-init-data") ?? "";
  const tgUser = verifyInitData(initData);
  if (!tgUser) return null;

  const telegramId = BigInt(tgUser.id);

  let user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        username: tgUser.username,
        firstName: tgUser.first_name,
        language: tgUser.language_code === "km" ? "kh" : "en",
        categories: {
          create: DEFAULT_CATEGORIES.map((c) => ({
            key: c.key,
            nameEn: c.nameEn,
            nameKh: c.nameKh,
            budget: c.budget,
            fixedDay: c.fixedDay,
            sortOrder: c.sortOrder,
          })),
        },
      },
    });
  }
  return user;
}
