"use client";

import { useState, useEffect } from "react";
import { casinoAudio } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Volume2, VolumeX, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Card {
  suit: "♠" | "♥" | "♦" | "♣";
  value: string;
  weight: number;
}

const SUITS: ("♠" | "♥" | "♦" | "♣")[] = ["♠", "♥", "♦", "♣"];
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function getDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const val of VALUES) {
      let weight = parseInt(val);
      if (["J", "Q", "K"].includes(val)) weight = 10;
      if (val === "A") weight = 11;
      deck.push({ suit, value: val, weight });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function calculateHandScore(hand: Card[]): number {
  let score = hand.reduce((acc, card) => acc + card.weight, 0);
  let aces = hand.filter((c) => c.value === "A").length;
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
}

interface ClassicBlackjackProps {
  initialBalance: number;
  isLoggedIn: boolean;
}

export function ClassicBlackjack({ initialBalance, isLoggedIn }: ClassicBlackjackProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [betAmount, setBetAmount] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<"idle" | "playing" | "ended">("idle");
  const [gameResult, setGameResult] = useState<string | null>(null);

  useEffect(() => {
    casinoAudio.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const handleDeal = () => {
    if (!isLoggedIn) {
      toast.error("Please log in to play for real balance.");
      return;
    }

    if (balance < betAmount) {
      toast.error("Insufficient deposit balance.");
      return;
    }

    const newDeck = getDeck();
    const pHand = [newDeck.pop()!, newDeck.pop()!];
    const dHand = [newDeck.pop()!, newDeck.pop()!];

    setDeck(newDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setGameState("playing");
    setGameResult(null);

    setBalance((prev) => Number((prev - betAmount).toFixed(2)));
    casinoAudio.playCardFlip();

    const pScore = calculateHandScore(pHand);
    if (pScore === 21) {
      // Natural Blackjack
      const win = Number((betAmount * 2.5).toFixed(2));
      setBalance((prev) => Number((prev + win).toFixed(2)));
      setGameState("ended");
      setGameResult("BLACKJACK! You Win 3:2!");
      casinoAudio.playBigWin();
    }
  };

  const handleHit = () => {
    if (gameState !== "playing") return;

    const currentDeck = [...deck];
    const card = currentDeck.pop()!;
    const newHand = [...playerHand, card];

    setDeck(currentDeck);
    setPlayerHand(newHand);
    casinoAudio.playCardFlip();

    const pScore = calculateHandScore(newHand);
    if (pScore > 21) {
      setGameState("ended");
      setGameResult("BUST! Dealer Wins.");
      casinoAudio.playExplosion();
    }
  };

  const handleStand = () => {
    if (gameState !== "playing") return;

    let currentDeck = [...deck];
    let dHand = [...dealerHand];
    let dScore = calculateHandScore(dHand);

    // Dealer hits on soft 17
    while (dScore < 17) {
      const card = currentDeck.pop()!;
      dHand.push(card);
      dScore = calculateHandScore(dHand);
      casinoAudio.playCardFlip();
    }

    setDealerHand(dHand);
    setGameState("ended");

    const pScore = calculateHandScore(playerHand);

    if (dScore > 21) {
      const win = Number((betAmount * 2).toFixed(2));
      setBalance((prev) => Number((prev + win).toFixed(2)));
      setGameResult("Dealer BUST! You Win!");
      casinoAudio.playSlotWin();
    } else if (pScore > dScore) {
      const win = Number((betAmount * 2).toFixed(2));
      setBalance((prev) => Number((prev + win).toFixed(2)));
      setGameResult("You Win!");
      casinoAudio.playSlotWin();
    } else if (pScore === dScore) {
      setBalance((prev) => Number((prev + betAmount).toFixed(2)));
      setGameResult("PUSH! Bet refunded.");
    } else {
      setGameResult("Dealer Wins.");
    }
  };

  const pScore = calculateHandScore(playerHand);
  const dScore = gameState === "playing" ? dealerHand[0]?.weight || 0 : calculateHandScore(dealerHand);

  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl border border-emerald-500/20 bg-zinc-950/90 p-4 sm:p-8 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex w-full items-center justify-between border-b border-emerald-500/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">Classic Blackjack 21</h1>
            <p className="text-xs text-zinc-400">Dealer stands on 17 • Blackjack pays 3:2</p>
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

      {/* Blackjack Green Felt Table */}
      <div className="relative flex w-full flex-col items-center justify-between min-h-[380px] rounded-3xl border-4 border-emerald-600/40 bg-gradient-to-b from-emerald-950 via-emerald-900 to-zinc-950 p-6 shadow-2xl">
        {/* Dealer Hand Area */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
            Dealer Hand {dealerHand.length > 0 && `(${dScore})`}
          </div>
          <div className="flex gap-2 min-h-[100px]">
            {dealerHand.map((card, idx) => {
              const isHidden = gameState === "playing" && idx === 1;
              return (
                <div
                  key={idx}
                  className={`flex h-24 w-16 flex-col items-center justify-between rounded-xl p-2 font-bold shadow-xl border ${
                    isHidden
                      ? "border-emerald-700 bg-gradient-to-br from-emerald-800 to-emerald-950 text-emerald-950"
                      : ["♥", "♦"].includes(card.suit)
                      ? "border-zinc-200 bg-white text-red-600"
                      : "border-zinc-200 bg-white text-zinc-900"
                  }`}
                >
                  {isHidden ? (
                    <div className="flex h-full w-full items-center justify-center text-xs text-emerald-400/50">SPINORA</div>
                  ) : (
                    <>
                      <div className="self-start text-xs">{card.value}</div>
                      <div className="text-2xl">{card.suit}</div>
                      <div className="self-end text-xs">{card.value}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Result Overlay */}
        {gameResult && (
          <div className="my-4 animate-bounce rounded-2xl bg-zinc-950/90 border border-emerald-400 px-6 py-2 text-center text-lg font-black text-amber-300 shadow-2xl">
            {gameResult}
          </div>
        )}

        {/* Player Hand Area */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2 min-h-[100px]">
            {playerHand.map((card, idx) => (
              <div
                key={idx}
                className={`flex h-24 w-16 flex-col items-center justify-between rounded-xl p-2 font-bold shadow-xl border ${
                  ["♥", "♦"].includes(card.suit) ? "border-zinc-200 bg-white text-red-600" : "border-zinc-200 bg-white text-zinc-900"
                }`}
              >
                <div className="self-start text-xs">{card.value}</div>
                <div className="text-2xl">{card.suit}</div>
                <div className="self-end text-xs">{card.value}</div>
              </div>
            ))}
          </div>
          <div className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
            Player Hand {playerHand.length > 0 && `(${pScore})`}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase">Balance</div>
          <div className="text-2xl font-black text-emerald-400">${balance.toFixed(2)}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-bold">Chip Bet:</span>
          {[5, 10, 25, 50, 100].map((amt) => (
            <button
              key={amt}
              disabled={gameState === "playing"}
              onClick={() => {
                setBetAmount(amt);
                casinoAudio.playChip();
              }}
              className={`h-10 w-10 rounded-full font-black text-xs border transition-all ${
                betAmount === amt ? "border-amber-400 bg-amber-500 text-black shadow-lg" : "border-zinc-700 bg-zinc-800 text-zinc-300"
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {gameState === "idle" || gameState === "ended" ? (
            <Button
              onClick={handleDeal}
              className="h-12 px-8 rounded-xl bg-emerald-500 text-black font-extrabold text-base hover:bg-emerald-400"
            >
              DEAL HAND (${betAmount})
            </Button>
          ) : (
            <>
              <Button onClick={handleHit} className="h-12 px-6 rounded-xl bg-amber-500 text-black font-extrabold hover:bg-amber-400">
                HIT
              </Button>
              <Button onClick={handleStand} className="h-12 px-6 rounded-xl bg-blue-600 text-white font-extrabold hover:bg-blue-500">
                STAND
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
