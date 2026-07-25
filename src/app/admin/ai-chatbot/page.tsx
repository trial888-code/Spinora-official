import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WebsiteAiChatbotManager } from "@/components/admin/admin-faq-manager";
import { AdminAiBotControlCard } from "@/components/admin/admin-ai-bot-control-card";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Website AI Customer Support & FAQ Center" };

export default async function AdminAiChatbotPage() {
  await requirePermission("cms.manage");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        title="Website AI Customer Support Chatbot"
        description="100% Non-Tech Admin Hub! Train your website chatbot with FAQs so it responds to your players 24/7 with human-like accuracy."
      />

      {/* 🟢 1-Click Assistant Controls (Power Switch & Personality Tone) */}
      <AdminAiBotControlCard />

      {/* 💡 Website FAQ Training Form & Live Chat Simulator */}
      <WebsiteAiChatbotManager />
    </div>
  );
}
