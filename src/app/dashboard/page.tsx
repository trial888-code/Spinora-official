import { CosmicDashboardView } from "@/components/dashboard/cosmic-dashboard-view";
import type { LobbyPlatform } from "@/components/dashboard/game-lobby-switcher";
import {
  getActiveJobsByGame,
  getDashboardGameAccounts,
  getWalletData,
} from "@/lib/data/dashboard";
import { getDashboardRollover } from "@/lib/data/rollover";
import { GAMES } from "@/lib/games";

function buildLobbyPlatforms(
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

  const liveGames = GAMES.filter((g) => !g.upcoming);

  const sortedGames = [...liveGames].sort((a, b) => {
    const hasA = bySlug.has(a.slug) ? 1 : 0;
    const hasB = bySlug.has(b.slug) ? 1 : 0;
    return hasB - hasA || b.players - a.players;
  });

  return sortedGames.map((game) => {
    const account = bySlug.get(game.slug);
    const customImage = account?.games?.image_url || game.image;
    const customDownloadUrl = (account?.games as { download_url?: string | null } | undefined)?.download_url || game.downloadUrl;

    return {
      slug: game.slug,
      name: account?.games?.name || game.name,
      image: customImage,
      tagline: game.bio?.slice(0, 72) ?? "Create account & load instantly.",
      downloadUrl: customDownloadUrl,
      linked: Boolean(account && !account.pending),
      username: account?.game_username,
      password: account
        ? ((account as { game_password?: string | null }).game_password ?? null)
        : null,
      pending: account?.pending,
    };
  });
}

export default async function DashboardHomePage() {
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
      platforms={buildLobbyPlatforms(accounts)}
      activeJobs={activeJobs}
    />
  );
}
