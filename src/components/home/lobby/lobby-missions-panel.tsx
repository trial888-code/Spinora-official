"use client";

import { DailyQuestsCard } from "@/components/dashboard/daily-quests-card";
import { Flame, Target, Trophy } from "lucide-react";
import { useLobbyProfile } from "@/components/home/lobby/use-lobby-profile";

export function LobbyMissionsPanel() {
  const { profile } = useLobbyProfile();
  const level = profile?.level ?? 1;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-400/90">Missions</p>
        <h2 className="text-xl font-black text-white sm:text-2xl">Daily quests & rewards</h2>
        <p className="mt-1 text-sm text-purple-200/70">Complete tasks to earn VIP points and bonus credits.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-purple-500/25 bg-purple-950/40 p-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Flame className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Streak</span>
          </div>
          <p className="mt-2 text-2xl font-black text-white">—</p>
        </div>
        <div className="rounded-xl border border-purple-500/25 bg-purple-950/40 p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Target className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Quests</span>
          </div>
          <p className="mt-2 text-2xl font-black text-white">4</p>
        </div>
        <div className="rounded-xl border border-purple-500/25 bg-purple-950/40 p-4">
          <div className="flex items-center gap-2 text-fuchsia-400">
            <Trophy className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Level</span>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{level}</p>
        </div>
      </div>

      <DailyQuestsCard />
    </div>
  );
}
