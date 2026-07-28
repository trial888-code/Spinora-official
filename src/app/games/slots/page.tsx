import { createMetadata } from "@/lib/seo/metadata";
import { FortuneSlots } from "@/components/games/fortune-slots";
import { VipPageLayout } from "@/components/layout/vip-page-layout";
import { getMyWallet } from "@/lib/actions/wallet";
import { createClient } from "@/lib/supabase/server";

export const metadata = createMetadata({
  title: "Spinora Fortune Slots — Play Online Slots",
  description: "Play Spinora Fortune Slots with 25 paylines, wild multipliers, scatter free spins, and provably fair payouts.",
  keywords: ["online slots", "casino slots", "fortune slots", "provably fair slots", "Spinora"],
  path: "/games/slots",
});

export default async function SlotsPage() {
  const wallet = await getMyWallet();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const balance = "error" in wallet ? 0 : wallet.walletBalance;

  return (
    <VipPageLayout contentClassName="vip-page-content mx-auto max-w-6xl py-6 px-4">
      <FortuneSlots initialBalance={balance} isLoggedIn={!!user} />
    </VipPageLayout>
  );
}
