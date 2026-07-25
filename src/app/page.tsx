import { CosmicPublicShell } from "@/components/home/cosmic-public-shell";
import { HomeLandingShell } from "@/components/home/home-landing-shell";
import { CosmicLoggedInHubLoader } from "@/components/home/cosmic-logged-in-hub-loader";
import { HomeFaq } from "@/components/spinora/home-faq";
import { getLinkedGameSlugs } from "@/lib/data/dashboard";
import { getFaqs, getGames } from "@/lib/data/marketing";
import { buildLobbyCatalog } from "@/lib/games-marketing";
import { getAuthUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getAuthUser();

  /* ── Public landing (mockup image 3) ── */
  if (!user) {
    const faqs = await getFaqs();
    return (
      <CosmicPublicShell
        footer={faqs.length > 0 ? <HomeFaq faqs={faqs} /> : undefined}
      />
    );
  }

  /* ── Logged-in: mockup dashboard shell (image 5) ── */
  const [linkedGameSlugs, dbGames] = await Promise.all([
    getLinkedGameSlugs(user.id),
    getGames(),
  ]);
  const lobbyCatalog = buildLobbyCatalog(dbGames);

  return (
    <HomeLandingShell
      linkedGameSlugs={linkedGameSlugs}
      lobbyCatalog={lobbyCatalog}
      initialLoggedIn
      loggedInHub={<CosmicLoggedInHubLoader />}
    />
  );
}
