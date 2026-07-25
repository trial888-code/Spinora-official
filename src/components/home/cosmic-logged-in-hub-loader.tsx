import { CosmicDashboardView } from "@/components/dashboard/cosmic-dashboard-view";
import type { LobbyPlatform } from "@/components/dashboard/game-lobby-switcher";
import {
  getActiveJobsByGame,
  getDashboardGameAccounts,
  getWalletData,
} from "@/lib/data/dashboard";
import { getDashboardRollover } from "@/lib/data/rollover";
import { GAMES } from "@/lib/games";
import { getAuthUser } from "@/lib/supabase/session";

const FEATURED_SLUGS = ["juwa", "fire-kirin", "game-vault", "orion-stars"] as const;

function buildPlatforms(
  accounts: Awaited<ReturnType<typeof getDashboardGameAccounts>>
): LobbyPlatform[] {
  const bySlug = new Map(
    accounts
      .map((a) => {
        const slug = a.games?.slug;
        return slug ? ([slug, a] as const) : null;
      })
      .filter((e): e is [string, (typeof accounts)[number]] => e !== null)
  );

  return FEATURED_SLUGS.map((slug) => {
    const catalog = GAMES.find((g) => g.slug === slug);
    const account = bySlug.get(slug);
    return {
      slug,
      name: catalog?.name ?? slug,
      image: catalog?.image ?? "/games/juwa.webp",
      tagline: catalog?.bio?.slice(0, 72) ?? "Create account & load instantly.",
      linked: Boolean(account && !account.pending),
      username: account?.game_username,
      password: account
        ? ((account as { game_password?: string | null }).game_password ?? null)
        : null,
      pending: account?.pending,
    };
  });
}

export async function CosmicLoggedInHubLoader() {
  const user = await getAuthUser();
  if (!user) return null;

  const [wallet, rollover, accounts, activeJobs] = await Promise.all([
    getWalletData(),
    getDashboardRollover(),
    getDashboardGameAccounts(),
    getActiveJobsByGame(),
  ]);

  return (
    <CosmicDashboardView
      wallet={{ play: wallet.balance, cashout: wallet.cashout }}
      rollover={rollover}
      platforms={buildPlatforms(accounts)}
      activeJobs={activeJobs}
      showBrowseLink={false}
    />
  );
}
