"use server";

import { revalidatePath } from "next/cache";
import { generateAndSaveAIBlogPost } from "@/lib/ai/blog-generator";
import { authorize } from "@/lib/actions/admin/core";

export async function generateBlogArticleAction(topic?: string, keywords?: string[]) {
  const auth = await authorize("cms.manage");
  if ("error" in auth && process.env.NODE_ENV !== "development") {
    return { ok: false as const, error: auth.error };
  }

  try {
    const result = await generateAndSaveAIBlogPost({ topic, targetKeywords: keywords });
    if (!result.ok || !result.post) {
      return { ok: false as const, error: result.error || "Failed to generate blog article." };
    }

    revalidatePath("/admin/ai-blog");
    revalidatePath("/admin/cms");
    revalidatePath("/blog");

    return {
      ok: true as const,
      post: result.post,
      postId: result.postId,
      telegramBroadcast: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error during blog generation";
    return { ok: false as const, error: msg };
  }
}
