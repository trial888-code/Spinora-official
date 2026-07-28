import { createMetadata } from "@/lib/seo/metadata";
import { ClassicBlackjack } from "@/components/games/classic-blackjack";
import { VipPageLayout } from "@/components/layout/vip-page-layout";
import { getMyWallet } from "@/lib/actions/wallet";
import { createClient } from "@/lib/supabase/server";

export const metadata = createMetadata({
  title: "Spinora Classic Blackjack — Play 21 Online",
  description: "Play classic Blackjack with single and multi-deck rules, dealer soft 17, double down, split, and provably fair payout resolution.",
  keywords: ["online blackjack", "blackjack 21", "casino games", "provably fair blackjack", "Spinora"],
  path: "/games/blackjack",
});

export default async function BlackjackPage() {
  const wallet = await getMyWallet();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const balance = "error" in wallet ? 0 : wallet.walletBalance;

  return (
    <VipPageLayout contentClassName="vip-page-content mx-auto max-w-6xl py-6 px-4">
      <ClassicBlackjack initialBalance={balance} isLoggedIn={!!user} />
    </VipPageLayout>
  );
}
