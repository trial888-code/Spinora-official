import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

loadEnv();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let lastUpdateId = 0;
const groupTotals = {};
const pendingOrdersMeta = {};
const processedFileIds = new Set(); // Stores processed Telegram photo file IDs to block duplicates!

function getGroupTotal(chatId) {
  if (!chatId) return 0.0;
  if (groupTotals[chatId] === undefined) {
    groupTotals[chatId] = 0.0;
  }
  return groupTotals[chatId];
}

function setGroupTotal(chatId, newTotal) {
  if (chatId) groupTotals[chatId] = Number(newTotal);
}

function addDepositToGroupTotal(chatId, amount) {
  const oldTotal = getGroupTotal(chatId);
  const numAmt = Number(amount ?? 0);
  const newTotal = oldTotal + numAmt;
  if (chatId) groupTotals[chatId] = newTotal;
  return {
    oldTotal,
    newTotal,
    formula: `${oldTotal.toFixed(2)} + ${numAmt.toFixed(2)} = ${newTotal.toFixed(2)}`,
  };
}

async function sendTelegramMessage(chatId, text, replyToId, replyMarkup) {
  if (!BOT_TOKEN || !chatId) return null;
  try {
    const body = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    };
    if (replyToId) body.reply_to_message_id = replyToId;

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json?.result?.message_id ?? null;
  } catch (e) {
    console.error("sendTelegramMessage Error:", e.message);
    return null;
  }
}

async function deleteTelegramMessage(chatId, messageId) {
  if (!BOT_TOKEN || !chatId || !messageId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  } catch {}
}

async function answerCallbackQuery(callbackQueryId, text) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: true,
      }),
    });
  } catch {}
}

async function editMessageText(chatId, messageId, text) {
  if (!BOT_TOKEN || !chatId || !messageId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (e) {
    console.error("editMessageText error:", e.message);
  }
}

async function downloadPhotoBase64(fileId) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const json = await res.json();
    const filePath = json?.result?.file_path;
    if (!filePath) return null;

    const imgRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    const buf = await imgRes.arrayBuffer();
    return Buffer.from(buf).toString("base64");
  } catch {
    return null;
  }
}

async function extractGeminiVisionOcr(base64Photo) {
  if (!GEMINI_API_KEY) {
    return { platform: "CashApp", amount: null, sender: null, status: "Failed" };
  }

  const prompt = `
Look at this payment receipt image very carefully.

CRITICAL INSTRUCTIONS FOR AMOUNT EXTRACTION:
1. Read ONLY the PRIMARY TOP RECEIPT amount text (e.g. big dollar text "$10.20", "$10.00", "$25.50").
2. DO NOT read small transaction history lists at the bottom of the screen (ignore items like "$5.00", "$36.00").
3. DO NOT ROUND CENTS TO INTEGERS. If the screen says "$10.20", extract 10.20.

Platform Detection Rules:
- "CashApp": Default for Cash App receipts, Cash balance, $ dollar payments, or transaction details ("Complete Payment sent successfully", "Payment between").
- "Venmo": ONLY if explicit Venmo logo or @handle is explicitly shown.
- "PayPal": PayPal layout.
- "Chime": Chime layout.

Output strict raw JSON only:
{
  "platform": "CashApp" | "Venmo" | "PayPal" | "Chime" | "Crypto" | "Other",
  "amount": number,
  "sender": string,
  "status": "Complete" | "Pending" | "Failed"
}
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Photo,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const jsonStr = rawText.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      platform: parsed.platform || "CashApp",
      amount: parsed.amount !== undefined && parsed.amount !== null ? Number(parsed.amount) : null,
      sender: parsed.sender || null,
      status: parsed.status || "Complete",
    };
  } catch (err) {
    console.error("Gemini OCR fetch error:", err.message);
    return { platform: "CashApp", amount: null, sender: null, status: "Failed" };
  }
}

async function handleCallbackQuery(cb) {
  const data = cb.data || "";
  const adminChatId = cb.message?.chat?.id;
  const adminMsgId = cb.message?.message_id;

  console.log(`\n🖱️ Admin Clicked Inline Button: "${data}"`);

  if (data.startsWith("approve_")) {
    const orderId = data.replace("approve_", "");

    const { data: order } = await db
      .from("payment_orders")
      .update({ status: "paid" })
      .eq("id", orderId)
      .select("*")
      .maybeSingle();

    await db.from("deposit_requests").update({ status: "completed" }).eq("id", orderId);

    let meta = pendingOrdersMeta[orderId] || {};
    if (!meta.groupChatId && order?.memo) {
      try {
        meta = JSON.parse(order.memo);
      } catch {}
    }

    const amt = Number(meta.amount || order?.amount || 10.0);
    const userId = order?.user_id || "c1931a25-745b-42aa-a3d4-857d267cdf31";
    const targetGroupChatId = meta.groupChatId;
    const platformName = meta.platformName || "CashApp";

    try {
      await db.rpc("admin_adjust_user_wallet", { p_user_id: userId, p_wallet_balance: amt });
    } catch {}

    const calc = addDepositToGroupTotal(targetGroupChatId, amt);

    await answerCallbackQuery(cb.id, `✅ Admin Approved +$${amt.toFixed(2)}!\nMath: ${calc.formula}`);

    // Edit Private Admin Message
    if (adminChatId && adminMsgId) {
      await editMessageText(
        adminChatId,
        adminMsgId,
        `✅ <b>MANUALLY APPROVED BY ADMIN!</b>\n` +
          `Order: <code>#${orderId.slice(0, 8)}</code>\n` +
          `Amount: <b>+$${amt.toFixed(2)}</b> (${platformName}) Credited to Wallet!\n` +
          `📊 Group Math: <code>${calc.formula}</code> 🎯`
      );
    }

    // GROUP RECEIPT ON MANUAL ADMIN APPROVAL
    const compactGroupReceipt =
      `✅ <b>DEPOSIT APPROVED BY ADMIN!</b>\n` +
      `👤 Member: <b>${meta.tgUserName || meta.senderName || "Player"}</b>\n` +
      `💰 Amount: <b>+$${amt.toFixed(2)}</b> (${platformName})\n` +
      `🛡️ Check: <b>🟢 MANUALLY VERIFIED & APPROVED BY ADMIN</b>\n` +
      `📊 Group Total: <code>${calc.formula}</code> 🎯`;

    if (targetGroupChatId) {
      if (meta.groupStatusMsgId) {
        setTimeout(() => deleteTelegramMessage(targetGroupChatId, meta.groupStatusMsgId), 1000);
      }
      await sendTelegramMessage(targetGroupChatId, compactGroupReceipt, meta.groupMsgId);
    }
  } else if (data.startsWith("reject_")) {
    const orderId = data.replace("reject_", "");

    const { data: order } = await db
      .from("payment_orders")
      .update({ status: "rejected" })
      .eq("id", orderId)
      .select("*")
      .maybeSingle();

    await db.from("deposit_requests").update({ status: "rejected" }).eq("id", orderId);

    let meta = pendingOrdersMeta[orderId] || {};
    if (!meta.groupChatId && order?.memo) {
      try {
        meta = JSON.parse(order.memo);
      } catch {}
    }

    const amt = Number(meta.amount || order?.amount || 0);
    const targetGroupChatId = meta.groupChatId;

    await answerCallbackQuery(cb.id, `❌ Order #${orderId.slice(0, 8)} Rejected`);

    if (adminChatId && adminMsgId) {
      await editMessageText(
        adminChatId,
        adminMsgId,
        `❌ <b>REJECTED BY ADMIN</b>\n` +
          `Order: <code>#${orderId.slice(0, 8)}</code> set to Rejected.`
      );
    }

    if (targetGroupChatId) {
      if (meta.groupStatusMsgId) {
        setTimeout(() => deleteTelegramMessage(targetGroupChatId, meta.groupStatusMsgId), 1000);
      }
      await sendTelegramMessage(
        targetGroupChatId,
        `❌ <b>DEPOSIT REJECTED</b>\n` +
          `👤 Member: <b>${meta.tgUserName || meta.senderName || "Player"}</b> | 💰 $${amt.toFixed(2)} (Unverified / Fake Screenshot)`,
        meta.groupMsgId
      );
    }
  }
}

async function handleStatusCommand(chatId) {
  const { data: orders } = await db
    .from("payment_orders")
    .select("id, amount, platform, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const total = getGroupTotal(chatId);

  let text = `📊 <b>LIVE DEPOSIT LOGS & RUNNING TOTAL</b>\n` +
    `💰 Current Group Total: <b>$${total.toFixed(2)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  const rows = (orders ?? []).slice(0, 8).map((o) => ({
    id: String(o.id).slice(0, 8),
    amount: Number(o.amount ?? 0),
    platform: String(o.platform || "CashApp"),
    status: o.status === "paid" || o.status === "completed" ? "✅ PAID" : o.status === "rejected" ? "❌ REJECTED" : "⏳ PENDING",
  }));

  if (rows.length === 0) {
    text += `<i>No deposit records found.</i>\n`;
  } else {
    for (const r of rows) {
      text += `• <code>#${r.id}</code> | <b>$${r.amount.toFixed(2)}</b> (${r.platform.toUpperCase()}) | ${r.status}\n`;
    }
  }

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n<i>Use /settotal [amount] to set running total (e.g. /settotal 30.00)</i>`;
  await sendTelegramMessage(chatId, text);
}

async function processPhotoMessage(msg) {
  const chatId = msg.chat.id;
  const userMsgId = msg.message_id;
  const photos = msg.photo;

  if (!photos || photos.length === 0) return;

  const largestPhoto = photos[photos.length - 1];
  const fileUniqueId = largestPhoto.file_unique_id || largestPhoto.file_id;

  const tgUserName = msg.from?.first_name ? `${msg.from.first_name}${msg.from.last_name ? ` ${msg.from.last_name}` : ""}` : "Member";

  // 🚨 ANTI-DUPLICATE SCREENSHOT PROTECTION 1: Block same photo re-upload
  if (processedFileIds.has(fileUniqueId)) {
    console.warn(`⚠️ DUPLICATE SCREENSHOT DETECTED from ${tgUserName} (File ID: ${fileUniqueId})`);
    await sendTelegramMessage(
      chatId,
      `⚠️ <b>DUPLICATE SCREENSHOT BLOCKED!</b>\n` +
        `👤 Member: <b>${tgUserName}</b>\n` +
        `<i>This exact payment receipt photo was already submitted and processed. Re-using screenshots is not allowed.</i>`,
      userMsgId
    );
    return;
  }

  processedFileIds.add(fileUniqueId);

  console.log(`\n📸 Received Payment Screenshot in Telegram Group (${chatId}) from ${tgUserName}`);

  const analyzingMsgId = await sendTelegramMessage(chatId, "🔍 <i>Scanning receipt & checking Gmail inbox...</i>", userMsgId);
  if (analyzingMsgId) {
    setTimeout(() => deleteTelegramMessage(chatId, analyzingMsgId), 10000);
  }

  const base64 = await downloadPhotoBase64(largestPhoto.file_id);

  const ocr = base64 ? await extractGeminiVisionOcr(base64) : { platform: "CashApp", amount: null, sender: null };

  const amount = ocr.amount !== null && ocr.amount !== undefined ? ocr.amount : 10.0;
  const senderName = ocr.sender || tgUserName;
  const platformName = ocr.platform || "CashApp";

  console.log(`   Gemini OCR Result: ${platformName} - $${amount.toFixed(2)} (Sender: ${senderName})`);

  // 🚨 ANTI-DUPLICATE PROTECTION 2: Check if this exact Gmail deposit email was ALREADY CLAIMED
  const { data: existingClaimedTx } = await db
    .from("wallet_transactions")
    .select("id, description")
    .ilike("source", "email_webhook_%")
    .eq("amount", amount)
    .ilike("description", "%claimed%")
    .limit(1)
    .maybeSingle();

  if (existingClaimedTx) {
    await sendTelegramMessage(
      chatId,
      `❌ <b>DEPOSIT ALREADY CLAIMED!</b>\n` +
        `👤 Member: <b>${tgUserName}</b>\n` +
        `💰 Amount: <b>$${amount.toFixed(2)}</b>\n` +
        `<i>This bank email deposit for $${amount.toFixed(2)} has ALREADY been claimed and credited to a wallet.</i>`,
      userMsgId
    );
    return;
  }

  // STRICT GMAIL DEPOSIT INBOX CHECK
  const { data: emailMatch } = await db
    .from("wallet_transactions")
    .select("id")
    .ilike("source", "email_webhook_%")
    .eq("amount", amount)
    .limit(1)
    .maybeSingle();

  const GMAIL_DEPOSIT_CONFIRMED = Boolean(emailMatch);

  // CASE 1: REAL UNCLAIMED GMAIL DEPOSIT CONFIRMED -> AUTO APPROVE SAFE!
  if (GMAIL_DEPOSIT_CONFIRMED) {
    const calc = addDepositToGroupTotal(chatId, amount);

    // Mark email deposit transaction as CLAIMED in DB so no one can re-use it!
    try {
      await db
        .from("wallet_transactions")
        .update({ description: `Email deposit claimed by ${tgUserName}` })
        .eq("id", emailMatch.id);
    } catch {}

    const compactAutoApprovedCard =
      `✅ <b>DEPOSIT CONFIRMED IN GMAIL INBOX!</b>\n` +
      `👤 Member: <b>${tgUserName}</b>\n` +
      `💰 Amount: <b>+$${amount.toFixed(2)}</b> (${platformName})\n` +
      `📧 Bank Email Check: <b>🟢 REAL MONEY RECEIVED IN GMAIL</b>\n` +
      `📊 Group Total: <code>${calc.formula}</code> 🎯`;

    await sendTelegramMessage(chatId, compactAutoApprovedCard, userMsgId);
    console.log(`   🟢 REAL MONEY RECEIVED IN GMAIL! Auto-approved $${amount.toFixed(2)}`);
  } else {
    // CASE 2: NO GMAIL EMAIL RECEIVED YET -> DO NOT AUTO-CREDIT!
    const compactPendingCard =
      `⏳ <b>SCREENSHOT RECEIVED (WAITING FOR GMAIL DEPOSIT ALERT)</b>\n` +
      `👤 Member: <b>${tgUserName}</b> | 💰 <b>$${amount.toFixed(2)}</b> (${platformName})\n` +
      `📧 Bank Check: <b>⏳ No deposit email received in Gmail yet...</b>\n` +
      `🛡️ Status: <b>⚠️ UNVERIFIED - Pending Admin CashApp Check</b>`;

    const groupStatusMsgId = await sendTelegramMessage(chatId, compactPendingCard, userMsgId);

    const metaPayload = JSON.stringify({
      groupChatId: chatId,
      groupMsgId: userMsgId,
      groupStatusMsgId,
      senderName,
      tgUserName,
      platformName,
      amount,
    });

    const { data: newOrder } = await db
      .from("payment_orders")
      .insert({
        amount,
        platform: platformName.toLowerCase(),
        status: "pending_admin_review",
        memo: metaPayload,
      })
      .select("id")
      .single();

    const revId = newOrder?.id ?? `REVIEW-${Date.now()}`;

    pendingOrdersMeta[revId] = {
      groupChatId: chatId,
      groupMsgId: userMsgId,
      groupStatusMsgId,
      senderName,
      tgUserName,
      platformName,
      amount,
    };

    if (ADMIN_CHAT_ID) {
      const inlineMarkup = {
        inline_keyboard: [
          [
            { text: "✅ Approve & Credit", callback_data: `approve_${revId}` },
            { text: "❌ Reject", callback_data: `reject_${revId}` },
          ],
        ],
      };

      await sendTelegramMessage(
        ADMIN_CHAT_ID,
        `🚨 <b>NO GMAIL EMAIL CONFIRMATION YET!</b>\n` +
          `Order: <code>#${revId.slice(0, 8)}</code>\n` +
          `Platform: <b>${platformName}</b>\n` +
          `Amount: <b>$${amount.toFixed(2)}</b>\n` +
          `Member: <b>${tgUserName}</b>\n\n` +
          `⚠️ <b>SAFETY WARNING:</b> Check your actual CashApp/bank balance BEFORE clicking Approve!`,
        undefined,
        inlineMarkup
      );
    }
  }
}

async function startPolling() {
  console.log("=========================================================");
  console.log(" 🤖 TELEGRAM BOT REAL-TIME GROUP POLLING STARTED        ");
  console.log("=========================================================");
  console.log("Listening for incoming payment screenshots, inline buttons & commands...\n");

  while (true) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`
      );
      const json = await res.json();

      if (json.ok && Array.isArray(json.result)) {
        for (const update of json.result) {
          lastUpdateId = update.update_id;

          if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
          } else if (update.message) {
            const msgText = (update.message.text || "").trim();
            if (msgText.startsWith("/settotal")) {
              const val = Number(msgText.replace("/settotal", "").trim() || 0.0);
              setGroupTotal(update.message.chat.id, val);
              await sendTelegramMessage(update.message.chat.id, `🎯 <b>Group Running Total Set to: $${val.toFixed(2)}</b>`);
            } else if (msgText === "/status" || msgText === "/deposits" || msgText === "/total") {
              await handleStatusCommand(update.message.chat.id);
            } else if (update.message.photo) {
              await processPhotoMessage(update.message);
            }
          }
        }
      }
    } catch (e) {
      console.error("Polling error:", e.message);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

startPolling();
