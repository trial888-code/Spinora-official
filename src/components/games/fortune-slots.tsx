"use client";

import { useState, useEffect } from "react";
import { casinoAudio } from "@/lib/sound";
import { playSlotBet, SLOT_SYMBOLS, PAYLINES_25, type SlotSymbol } from "@/lib/actions/casino-engine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Volume2, VolumeX, ShieldCheck, Sparkles, HelpCircle, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface FortuneSlotsProps {
  initialBalance: number;
  isLoggedIn: boolean;
}

export function FortuneSlots({ initialBalance, isLoggedIn }: FortuneSlotsProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [betPerLine, setBetPerLine] = useState(0.2);
  const [paylinesCount, setPaylinesCount] = useState(25);
  const [spinning, setSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [lastWin, setLastWin] = useState<number | null>(null);

  // Current display reel matrix (5 reels x 3 rows)
  const [reels, setReels] = useState<SlotSymbol[][]>([
    [SLOT_SYMBOLS[0], SLOT_SYMBOLS[1], SLOT_SYMBOLS[2]],
    [SLOT_SYMBOLS[3], SLOT_SYMBOLS[4], SLOT_SYMBOLS[5]],
    [SLOT_SYMBOLS[6], SLOT_SYMBOLS[7], SLOT_SYMBOLS[0]],
    [SLOT_SYMBOLS[1], SLOT_SYMBOLS[2], SLOT_SYMBOLS[3]],
    [SLOT_SYMBOLS[4], SLOT_SYMBOLS[5], SLOT_SYMBOLS[6]],
  ]);

  const [winningPaylines, setWinningPaylines] = useState<number[]>([]);
  const [provablyFairData, setProvablyFairData] = useState<{
    serverSeedHash?: string;
    clientSeed?: string;
    nonce?: number;
  }>({});

  const totalBet = Number((betPerLine * paylinesCount).toFixed(2));

  useEffect(() => {
    casinoAudio.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const handleSpin = async () => {
    if (!isLoggedIn) {
      toast.error("Please sign in or create an account to play for real cash!");
      return;
    }

    if (spinning) return;

    if (balance < totalBet && freeSpinsLeft <= 0) {
      toast.error("Insufficient deposit balance. Please top up your wallet!");
      setAutoSpin(false);
      return;
    }

    setSpinning(true);
    setWinningPaylines([]);
    setLastWin(null);

    // Play reel spinning sound animation
    const tickInterval = setInterval(() => {
      casinoAudio.playReelTick();
    }, 90);

    try {
      const res = await playSlotBet({
        betPerLine,
        activePaylinesCount: paylinesCount,
      });

      clearInterval(tickInterval);

      if (res.error) {
        toast.error(res.error);
        setSpinning(false);
        setAutoSpin(false);
        return;
      }

      if (res.success && res.reelMatrix) {
        setReels(res.reelMatrix);
        setBalance(res.newBalance);
        setLastWin(res.totalWin);
        setProvablyFairData(res.provablyFair);

        if (res.winningLines && res.winningLines.length > 0) {
          setWinningPaylines(res.winningLines.map((l) => l.paylineId));
          if (res.totalWin > totalBet * 5) {
            casinoAudio.playBigWin();
            toast.success(`🎉 MEGA WIN! You won $${res.totalWin.toFixed(2)}!`);
          } else {
            casinoAudio.playSlotWin();
            toast.success(`✨ You won $${res.totalWin.toFixed(2)}!`);
          }
        }

        if (res.freeSpinsAwarded > 0) {
          setFreeSpinsLeft((prev) => prev + res.freeSpinsAwarded);
          toast.success(`🌀 SCATTER BONUS TRIGGERED! ${res.freeSpinsAwarded} FREE SPINS AWARDED!`);
        }
      }
    } catch (err) {
      clearInterval(tickInterval);
      toast.error("Network error during spin. Please try again.");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl border border-amber-500/20 bg-zinc-950/80 p-4 sm:p-8 backdrop-blur-xl shadow-2xl">
      {/* Top Controls Header */}
      <div className="flex w-full items-center justify-between border-b border-amber-500/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide flex items-center gap-2">
              Fortune Slots
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                25 Paylines
              </span>
            </h1>
            <p className="text-xs text-zinc-400">5x3 Reels • Wild Multipliers • Scatter Free Spins</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="h-5 w-5 text-amber-400" /> : <VolumeX className="h-5 w-5 text-zinc-600" />}
          </Button>

          {/* Paytable Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-500/40">
                <HelpCircle className="h-4 w-4 mr-1 text-amber-400" /> Paytable
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-amber-500/20 bg-zinc-950 text-white">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-amber-400">Fortune Slots Paytable</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-xs">
                {SLOT_SYMBOLS.map((sym) => (
                  <div key={sym.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5">
                    <span className="text-2xl">{sym.symbol}</span>
                    <div>
                      <div className="font-bold text-white">{sym.name}</div>
                      <div className="text-amber-400">5x: {sym.multiplier5}x | 4x: {sym.multiplier4}x | 3x: {sym.multiplier}x</div>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Provably Fair Modal */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40">
                <ShieldCheck className="h-4 w-4 mr-1" /> Fair
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-emerald-500/20 bg-zinc-950 text-white">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> Provably Fair Verification
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-xs text-zinc-300 py-2">
                <p>Spinora uses HMAC-SHA256 seed hashing to guarantee 100% fair spin outcomes.</p>
                <div className="rounded-xl bg-zinc-900 p-3 border border-zinc-800 space-y-2">
                  <div>
                    <span className="text-zinc-500 font-mono block text-[10px]">SERVER SEED HASH:</span>
                    <span className="font-mono text-amber-300 break-all">{provablyFairData.serverSeedHash || "Not spun yet"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono block text-[10px]">CLIENT SEED:</span>
                    <span className="font-mono text-zinc-300">{provablyFairData.clientSeed || "spinora_default_seed"}</span>
                  </div>
                </div>
                <Link href="/provably-fair" className="text-emerald-400 underline block text-center pt-1 font-semibold">
                  Open Independent Verifier Tool &rarr;
                </Link>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Slots Machine Housing */}
      <div className="relative w-full rounded-2xl border-4 border-amber-500/30 bg-gradient-to-b from-zinc-900 via-black to-zinc-950 p-4 shadow-inner">
        {/* Animated Win Banner */}
        {lastWin !== null && lastWin > 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 animate-bounce rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 px-6 py-1 text-xs font-black text-black shadow-lg shadow-amber-500/50 uppercase tracking-widest">
            WINNER! +${lastWin.toFixed(2)}
          </div>
        )}

        {/* 5x3 Reels Grid */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3 py-4">
          {reels.map((reel, reelIdx) => (
            <div
              key={reelIdx}
              className={`flex flex-col gap-2 rounded-xl border border-amber-500/10 bg-zinc-900/90 p-2 text-center transition-all ${
                spinning ? "animate-pulse" : ""
              }`}
            >
              {reel.map((sym, rowIdx) => (
                <div
                  key={rowIdx}
                  className={`flex h-16 sm:h-24 w-full flex-col items-center justify-center rounded-lg bg-gradient-to-b from-zinc-950 to-zinc-900 p-1 border border-zinc-800/80 transition-transform duration-200 ${
                    spinning ? "scale-95 blur-[0.5px]" : "scale-100"
                  }`}
                >
                  <span className="text-3xl sm:text-5xl transition-transform hover:scale-110 drop-shadow-md">{sym.symbol}</span>
                  <span className="text-[10px] font-semibold text-zinc-400 mt-1">{sym.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Control Panel Bar */}
      <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        {/* Balance & Win readout */}
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Deposit Balance</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">${balance.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Bet</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">${totalBet.toFixed(2)}</div>
          </div>
        </div>

        {/* Bet Selectors */}
        <div className="flex items-center gap-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 block uppercase">Bet per Line</label>
            <div className="flex items-center gap-1 mt-1">
              {[0.1, 0.2, 0.5, 1.0, 2.5, 5.0].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetPerLine(amt)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    betPerLine === amt
                      ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Spin & Auto Buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSpin}
            disabled={spinning}
            className="h-14 px-8 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-extrabold text-lg shadow-xl shadow-amber-500/20 hover:from-amber-300 hover:to-amber-500 active:scale-95 disabled:opacity-50"
          >
            {spinning ? (
              <RefreshCw className="h-6 w-6 animate-spin text-black" />
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 fill-black" />
                <span>SPIN</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
