import type { ReactNode } from "react";

import { CosmicPublicHero } from "@/components/home/cosmic-public-hero";

import { CosmicPopularGames } from "@/components/home/cosmic-popular-games";

import { LiveWinFeed } from "@/components/home/live-win-feed";

import { CosmicLandingTrust } from "@/components/home/cosmic-landing-trust";



type Props = {

  footer?: ReactNode;

};



/** Public landing — Prompt B mockup (hero, showcase, ticker, trust) */

export function CosmicPublicLanding({ footer }: Props) {

  return (

    <div className="space-y-12 pb-16">

      <CosmicPublicHero />

      <CosmicPopularGames />

      <LiveWinFeed />

      <CosmicLandingTrust />

      {footer}

    </div>

  );

}

