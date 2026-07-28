import { createMetadata } from "@/lib/seo/metadata";
import { EuropeanRoulette } from "@/components/games/european-roulette";
import { VipPageLayout } from "@/components/layout/vip-page-layout";
import { getMyWallet } from "@/lib/actions/wallet";
import { createClient } from "@/lib/supabase/server";

export const metadata = createMetadata({
  title: "Spinora European Roulette — Play Roulette Online",
  description: "Spin the European Roulette wheel with single zero, inside and outside bets, race track betting, and instant provably fair balance payouts.",
  keywords: ["online roulette", "european roulette", "casino roulette", "Spinora", "provably fair"],
  path: "/games/roulette",
});

export default async function RoulettePage() {
  const wallet = await getMyWallet();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const balance = "error" in wallet ? 0 : wallet.walletBalance;

  return (
    <VipPageLayout contentClassName="vip-page-content mx-auto max-w-6xl py-6 px-4">
      <EuropeanRoulette initialBalance={balance} isLoggedIn={!!user} />
    </VipPageLayout>
  );
}
