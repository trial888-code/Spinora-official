"use client";

import { useState, useEffect } from "react";
import { casinoAudio } from "@/lib/sound";
import { playMinesTurn } from "@/lib/actions/casino-engine";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Volume2, VolumeX, Sparkles, Bomb, Gem } from "lucide-react";
import { toast } from "sonner";

interface SpinoraMinesProps {
  initialBalance: number;
  isLoggedIn: boolean;
}

export function SpinoraMines({ initialBalance, isLoggedIn }: SpinoraMinesProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [betAmount, setBetAmount] = useState(5);
  const [mineCount, setMineCount] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [gameState, setGameState] = useState<"idle" | "playing" | "ended">("idle");
  const [grid, setGrid] = useState<("hidden" | "gem" | "mine")[]>(Array(25).fill("hidden"));
  const [mineLocations, setMineLocations] = useState<number[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    casinoAudio.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Calculate current multiplier based on revealed count & mine count
  let currentMultiplier = 1;
  const safeTiles = 25 - mineCount;
  for (let i = 0; i < revealedCount; i++) {
    currentMultiplier *= (25 - i) / (safeTiles - i);
  }
  currentMultiplier = Number((currentMultiplier * 0.97).toFixed(2));
  const currentWin = Number((betAmount * currentMultiplier).toFixed(2));

  const handleStartGame = async () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to play.");
      return;
    }
    if (balance < betAmount) {
      toast.error("Insufficient deposit balance.");
      return;
    }

    const res = await playMinesTurn({
      action: "start",
      betAmount,
      mineCount,
      revealedCount: 0,
    });

    if (res.error) {
      toast.error(res.error);
      return;
    }

    // Generate random mine locations
    const locs: number[] = [];
    while (locs.length < mineCount) {
      const idx = Math.floor(Math.random() * 25);
      if (!locs.includes(idx)) locs.push(idx);
    }

    setMineLocations(locs);
    setGrid(Array(25).fill("hidden"));
    setRevealedCount(0);
    setGameState("playing");
    setBalance(res.newBalance || balance - betAmount);
    casinoAudio.playChip();
  };

  const handleTileClick = (index: number) => {
    if (gameState !== "playing" || grid[index] !== "hidden") return;

    if (mineLocations.includes(index)) {
      // BOOM! Hit a mine!
      casinoAudio.playExplosion();
      setGameState("ended");
      const newGrid = [...grid];
      mineLocations.forEach((m) => (newGrid[m] = "mine"));
      setGrid(newGrid);
      toast.error("BOOM! You hit a mine!");
    } else {
      // Safe Gem Reveal!
      casinoAudio.playGemReveal();
      const newGrid = [...grid];
      newGrid[index] = "gem";
      setGrid(newGrid);
      setRevealedCount((prev) => prev + 1);

      if (revealedCount + 1 === safeTiles) {
        // Auto cashout on clearing all safe tiles!
        handleCashout();
      }
    }
  };

  const handleCashout = async () => {
    if (gameState !== "playing" || revealedCount === 0) return;

    const res = await playMinesTurn({
      action: "cashout",
      betAmount,
      mineCount,
      revealedCount,
    });

    if (res.error) {
      toast.error(res.error);
      return;
    }

    if (res.success && res.newBalance) {
      setBalance(res.newBalance);
      setGameState("ended");
      casinoAudio.playSlotWin();
      toast.success(`🎉 CASHED OUT $${res.winAmount?.toFixed(2)} (${res.multiplier}x)!`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl border border-emerald-500/20 bg-zinc-950/90 p-4 sm:p-8 backdrop-blur-xl shadow-2xl">
      {/* Top Header */}
      <div className="flex w-full items-center justify-between border-b border-emerald-500/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">Spinora Mines</h1>
            <p className="text-xs text-zinc-400">5x5 Grid • Dynamic Multiplier • Instant Cashout</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-xl text-zinc-400 hover:bg-zinc-800"
          >
            {soundEnabled ? <Volume2 className="h-5 w-5 text-emerald-400" /> : <VolumeX className="h-5 w-5 text-zinc-600" />}
          </Button>
        </div>
      </div>

      {/* 5x5 Mines Grid */}
      <div className="grid grid-cols-5 gap-3 p-4 rounded-3xl border-4 border-emerald-600/30 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-inner">
        {grid.map((status, idx) => (
          <button
            key={idx}
            disabled={gameState !== "playing" || status !== "hidden"}
            onClick={() => handleTileClick(idx)}
            className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold transition-all duration-200 shadow-lg border ${
              status === "hidden"
                ? "bg-gradient-to-br from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 border-zinc-700 hover:border-emerald-500/50 hover:scale-105 active:scale-95"
                : status === "gem"
                ? "bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-400 text-white animate-pulse"
                : "bg-gradient-to-br from-red-600 to-red-900 border-red-500 text-white"
            }`}
          >
            {status === "gem" ? <Gem className="h-8 w-8 text-white fill-white" /> : status === "mine" ? <Bomb className="h-8 w-8 text-white fill-black animate-bounce" /> : ""}
          </button>
        ))}
      </div>

      {/* Control Panel */}
      <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase">Deposit Balance</div>
          <div className="text-2xl font-black text-emerald-400">${balance.toFixed(2)}</div>
        </div>

        {/* Mines Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400">Mines:</span>
          {[1, 3, 5, 10, 15].map((m) => (
            <button
              key={m}
              disabled={gameState === "playing"}
              onClick={() => setMineCount(m)}
              className={`h-9 px-3 rounded-xl font-bold text-xs border transition-all ${
                mineCount === m ? "border-emerald-400 bg-emerald-500 text-black shadow" : "border-zinc-700 bg-zinc-800 text-zinc-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {gameState === "idle" || gameState === "ended" ? (
            <Button
              onClick={handleStartGame}
              className="h-12 px-8 rounded-xl bg-emerald-500 text-black font-extrabold text-base hover:bg-emerald-400"
            >
              START GAME (${betAmount})
            </Button>
          ) : (
            <Button
              onClick={handleCashout}
              disabled={revealedCount === 0}
              className="h-12 px-8 rounded-xl bg-amber-500 text-black font-extrabold text-base hover:bg-amber-400"
            >
              CASH OUT (${currentWin.toFixed(2)} — {currentMultiplier}x)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
