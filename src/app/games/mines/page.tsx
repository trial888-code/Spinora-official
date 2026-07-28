import { createMetadata } from "@/lib/seo/metadata";
import { SpinoraMines } from "@/components/games/spinora-mines";
import { VipPageLayout } from "@/components/layout/vip-page-layout";
import { getMyWallet } from "@/lib/actions/wallet";
import { createClient } from "@/lib/supabase/server";

export const metadata = createMetadata({
  title: "Spinora Mines — High Stakes Grid Multiplier",
  description: "Play Spinora Mines grid game. Uncover diamond gems while avoiding hidden explosive mines for escalating cashout multipliers.",
  keywords: ["online mines", "mines game", "grid casino game", "Spinora", "provably fair"],
  path: "/games/mines",
});

export default async function MinesPage() {
  const wallet = await getMyWallet();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const balance = "error" in wallet ? 0 : wallet.walletBalance;

  return (
    <VipPageLayout contentClassName="vip-page-content mx-auto max-w-6xl py-6 px-4">
      <SpinoraMines initialBalance={balance} isLoggedIn={!!user} />
    </VipPageLayout>
  );
}
