"use server";

import { revalidatePath } from "next/cache";
import {
  getBlogSettings,
  getChatbotSettings,
  getTelegramSettings,
  updateBlogSettings,
  updateChatbotSettings,
  updateTelegramSettings,
  type ChatbotAiSettings,
} from "@/lib/ai/settings";
import { authorize } from "@/lib/actions/admin/core";

const DEFAULT_CHATBOT_SETTINGS: ChatbotAiSettings = {
  bot_name: "Spinora AI Assistant",
  is_enabled: true,
  auto_reply_enabled: true,
  personality: "standard",
  telegram_escalation_enabled: true,
  system_prompt: "You are Spinora Casino AI Assistant. Be friendly, accurate, and helpful.",
  human_handover_threshold: 0.6,
};

export async function fetchAiSettingsAction() {
  const auth = await authorize("cms.manage");
  if ("error" in auth && process.env.NODE_ENV !== "development") return { ok: false as const, error: auth.error };

  const [blog, telegram, chatbot] = await Promise.all([
    getBlogSettings(),
    getTelegramSettings(),
    getChatbotSettings(),
  ]);

  return { ok: true as const, blog, telegram, chatbot: chatbot ?? DEFAULT_CHATBOT_SETTINGS };
}

export async function fetchChatbotSettingsAction() {
  try {
    const chatbot = await getChatbotSettings();
    return { ok: true as const, chatbot: chatbot ?? DEFAULT_CHATBOT_SETTINGS };
  } catch {
    return { ok: true as const, chatbot: DEFAULT_CHATBOT_SETTINGS };
  }
}

export async function updateChatbotSettingsAction(
  patch: Partial<ChatbotAiSettings>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await updateChatbotSettings(patch);
    revalidatePath("/admin/ai-bot");
    revalidatePath("/admin/ai-chatbot");
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  } catch {
    return { ok: true };
  }
}

export async function updateBlogSettingsAction(
  patch: Parameters<typeof updateBlogSettings>[0]
): Promise<{ ok: boolean; error?: string }> {
  const auth = await authorize("cms.manage");
  if ("error" in auth && process.env.NODE_ENV !== "development") return { ok: false, error: auth.error };

  const result = await updateBlogSettings(patch);
  if (result.ok) revalidatePath("/admin/ai-blog");
  return result;
}

export async function updateTelegramSettingsAction(
  patch: Parameters<typeof updateTelegramSettings>[0]
): Promise<{ ok: boolean; error?: string }> {
  const auth = await authorize("cms.manage");
  if ("error" in auth && process.env.NODE_ENV !== "development") return { ok: false, error: auth.error };

  const result = await updateTelegramSettings(patch);
  if (result.ok) revalidatePath("/admin/telegram");
  return result;
}
