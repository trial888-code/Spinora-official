import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/services/telegram-bot";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, chatIds, campaignType } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ ok: false, error: "Broadcast message is required" }, { status: 400 });
    }

    const db = getDb();

    let targetChatIds: string[] = [];

    if (Array.isArray(chatIds) && chatIds.length > 0) {
      targetChatIds = chatIds;
    } else {
      const { data: subs } = await db
        .from("telegram_broadcast_subscribers")
        .select("telegram_chat_id")
        .eq("is_active", true);

      targetChatIds = (subs ?? []).map((s) => s.telegram_chat_id);
    }

    if (targetChatIds.length === 0) {
      // Fallback to Telegram Admin Chat ID if no active subscribers found
      const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (adminChat) targetChatIds.push(adminChat);
    }

    let successCount = 0;
    let failCount = 0;

    for (const chatId of targetChatIds) {
      const res = await sendTelegramMessage(chatId, message);
      if (res?.ok || res?.mock) {
        successCount++;
      } else {
        failCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Broadcast completed (${campaignType || "Promotional"})`,
      stats: {
        sent: successCount,
        failed: failCount,
        total: targetChatIds.length,
      },
    });
  } catch (err: any) {
    console.error("❌ Telegram Broadcast error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
