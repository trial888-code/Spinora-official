"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { VIP_TIERS } from "@/lib/constants";
import { Crown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { useDashboardProfile } from "@/lib/dashboard/dashboard-profile-context";

export function VipPageClient() {
  const dashboardProfile = useDashboardProfile();
  const profile = dashboardProfile?.profile;

  if (!profile) {
    return null;
  }

  const points = Number(profile.vip_points ?? 0);
  const currentTier = [...VIP_TIERS].reverse().find((t) => points >= t.minPoints) || VIP_TIERS[0];
  const currentIndex = VIP_TIERS.findIndex((t) => t.id === currentTier.id);
  const nextTier = VIP_TIERS[currentIndex + 1];

  const ptsInTier = points - currentTier.minPoints;
  const ptsNeeded = nextTier ? nextTier.minPoints - currentTier.minPoints : 1;
  const progress = nextTier ? Math.min(100, Math.max(0, (ptsInTier / ptsNeeded) * 100)) : 100;

  return (
    <div>
      <DashboardPageHeader
        title={
          <span className="flex items-center gap-2">
            <Crown className="h-7 w-7 text-yellow-400" /> VIP Status
          </span>
        }
        description="Track your VIP tier and benefits"
      />

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Tier</p>
              <p className="text-3xl font-bold capitalize text-amber-400">{currentTier.name}</p>
            </div>
            <Badge className="text-lg px-4 py-2 bg-purple-600/30 text-purple-200 border-purple-500/40">{points} pts</Badge>
          </div>
          <Progress value={progress} className="mb-2 h-3" />
          {nextTier ? (
            <p className="text-sm text-muted-foreground">
              <span className="text-amber-400 font-bold">{nextTier.minPoints - points}</span> points until <span className="text-white font-bold">{nextTier.name}</span>
            </p>
          ) : (
            <p className="text-sm text-emerald-400 font-bold">🎉 Maximum VIP Tier Unlocked!</p>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {VIP_TIERS.map((tier) => {
          const isCurrent = tier.id === currentTier.id;
          const isUnlocked = points >= tier.minPoints;
          return (
            <Card key={tier.id} className={cn(isCurrent && "ring-2 ring-amber-400 bg-amber-500/5")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{tier.name}</span>
                  {isCurrent ? (
                    <Badge className="bg-amber-500 text-black font-bold">Current</Badge>
                  ) : isUnlocked ? (
                    <Badge variant="success">Unlocked</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Locked ({tier.minPoints} pts)</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tier.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-400" /> {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
