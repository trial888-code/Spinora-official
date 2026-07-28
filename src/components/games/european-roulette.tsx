"use client";

import { useState, useRef, useEffect } from "react";
import { casinoAudio } from "@/lib/sound";
import { playRouletteSpin } from "@/lib/actions/casino-engine";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Volume2, VolumeX, Sparkles, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EuropeanRouletteProps {
  initialBalance: number;
  isLoggedIn: boolean;
}

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export function EuropeanRoulette({ initialBalance, isLoggedIn }: EuropeanRouletteProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [chipValue, setChipValue] = useState(5);
  const [bets, setBets] = useState<{ type: string; value?: number | string; amount: number }[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [lastNumbers, setLastNumbers] = useState<number[]>([17, 32, 0, 24, 7]);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef(0);

  const totalWager = Number(bets.reduce((acc, b) => acc + b.amount, 0).toFixed(2));

  useEffect(() => {
    casinoAudio.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Draw Roulette Wheel Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 10;

    const numbersOrder = [
      0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
    ];

    const sliceAngle = (2 * Math.PI) / numbersOrder.length;

    ctx.clearRect(0, 0, width, height);

    // Wheel outer rim
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#b45309";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#f59e0b";
    ctx.stroke();

    // Wheel slices
    numbersOrder.forEach((num, i) => {
      const startAngle = i * sliceAngle + rotationRef.current;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      if (num === 0) ctx.fillStyle = "#10b981";
      else if (RED_NUMBERS.includes(num)) ctx.fillStyle = "#ef4444";
      else ctx.fillStyle = "#18181b";

      ctx.fill();
      ctx.stroke();

      // Number labels
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(num.toString(), radius - 12, 4);
      ctx.restore();
    });

    // Center Gold Turret
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
    ctx.strokeStyle = "#fef08a";
    ctx.stroke();
  }, [spinning]);

  const addBet = (type: string, value?: number | string) => {
    if (spinning) return;
    casinoAudio.playChip();
    setBets((prev) => {
      const existingIdx = prev.findIndex((b) => b.type === type && b.value === value);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].amount += chipValue;
        return updated;
      }
      return [...prev, { type, value, amount: chipValue }];
    });
  };

  const clearBets = () => {
    if (spinning) return;
    setBets([]);
  };

  const handleSpin = async () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to play.");
      return;
    }
    if (bets.length === 0) {
      toast.error("Please place at least one bet on the roulette table.");
      return;
    }
    if (balance < totalWager) {
      toast.error("Insufficient deposit balance.");
      return;
    }

    setSpinning(true);
    setWinningNumber(null);

    // Spin Wheel Animation
    let currentRot = rotationRef.current;
    const spinInterval = setInterval(() => {
      currentRot += 0.25;
      rotationRef.current = currentRot;
      casinoAudio.playRouletteBall();
    }, 40);

    try {
      const res = await playRouletteSpin({ bets });
      clearInterval(spinInterval);

      if (res.error) {
        toast.error(res.error);
        setSpinning(false);
        return;
      }

      if (res.success && res.winningNumber !== undefined) {
        setWinningNumber(res.winningNumber);
        setBalance(res.newBalance);
        setLastNumbers((prev) => [res.winningNumber, ...prev.slice(0, 4)]);

        if (res.totalWin > 0) {
          casinoAudio.playSlotWin();
          toast.success(`🎉 Landed on ${res.winningNumber}! You won $${res.totalWin.toFixed(2)}!`);
        } else {
          toast.info(`Landed on ${res.winningNumber}. Hard luck!`);
        }
      }
    } catch (err) {
      clearInterval(spinInterval);
      toast.error("Network error.");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl border border-amber-500/20 bg-zinc-950/90 p-4 sm:p-8 backdrop-blur-xl shadow-2xl">
      {/* Top Header */}
      <div className="flex w-full items-center justify-between border-b border-amber-500/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-red-600 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">European Roulette</h1>
            <p className="text-xs text-zinc-400">Single Zero • Straight Up 35:1 • Red/Black Even Money</p>
          </div>
        </div>

        {/* Past Spin Log */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-zinc-900 px-3 py-1.5 border border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-500 mr-1">HISTORY:</span>
          {lastNumbers.map((num, i) => (
            <span
              key={i}
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                num === 0 ? "bg-emerald-600" : RED_NUMBERS.includes(num) ? "bg-red-600" : "bg-zinc-800"
              }`}
            >
              {num}
            </span>
          ))}
        </div>
      </div>

      {/* Main Wheel & Betting Board Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full items-center">
        {/* Canvas Wheel */}
        <div className="flex flex-col items-center justify-center">
          <canvas ref={canvasRef} width={260} height={260} className="rounded-full shadow-2xl border-4 border-amber-500/30" />
          {winningNumber !== null && (
            <div className="mt-3 text-lg font-black text-amber-400">
              Landed: <span className="text-white bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-700">{winningNumber}</span>
            </div>
          )}
        </div>

        {/* Interactive Betting Board */}
        <div className="md:col-span-2 flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-emerald-950/40 p-4">
          <div className="grid grid-cols-12 gap-1 text-center font-bold text-xs">
            {/* Number 0 */}
            <button
              onClick={() => addBet("straight", 0)}
              className="col-span-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2"
            >
              0 (Green)
            </button>

            {/* Numbers 1 - 36 */}
            {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => {
              const betOnNum = bets.find((b) => b.type === "straight" && b.value === n);
              return (
                <button
                  key={n}
                  onClick={() => addBet("straight", n)}
                  className={`col-span-1 relative h-10 rounded-lg flex flex-col items-center justify-center border text-white transition-all ${
                    RED_NUMBERS.includes(n) ? "bg-red-600 hover:bg-red-500 border-red-400" : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700"
                  }`}
                >
                  <span>{n}</span>
                  {betOnNum && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow">
                      ${betOnNum.amount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Outside Bets */}
          <div className="grid grid-cols-6 gap-2 text-xs font-bold pt-2">
            <button onClick={() => addBet("low")} className="col-span-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 py-2 rounded-lg">1-18</button>
            <button onClick={() => addBet("even")} className="col-span-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 py-2 rounded-lg">EVEN</button>
            <button onClick={() => addBet("red")} className="col-span-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg">RED</button>
            <button onClick={() => addBet("black")} className="col-span-1 bg-zinc-950 hover:bg-black border border-zinc-700 text-white py-2 rounded-lg">BLACK</button>
            <button onClick={() => addBet("odd")} className="col-span-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 py-2 rounded-lg">ODD</button>
            <button onClick={() => addBet("high")} className="col-span-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 py-2 rounded-lg">19-36</button>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase">Balance</div>
          <div className="text-2xl font-black text-emerald-400">${balance.toFixed(2)}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-bold">Chip Value:</span>
          {[1, 5, 25, 50, 100].map((v) => (
            <button
              key={v}
              onClick={() => setChipValue(v)}
              className={`h-9 w-9 rounded-full font-black text-xs border transition-all ${
                chipValue === v ? "border-amber-400 bg-amber-400 text-black shadow-lg" : "border-zinc-700 bg-zinc-800 text-zinc-300"
              }`}
            >
              ${v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={clearBets} disabled={spinning || bets.length === 0} className="border-zinc-700 bg-zinc-800 text-zinc-300">
            <Trash2 className="h-4 w-4 mr-1 text-red-400" /> Clear
          </Button>
          <Button
            onClick={handleSpin}
            disabled={spinning || bets.length === 0}
            className="h-12 px-8 rounded-xl bg-amber-500 text-black font-extrabold text-base hover:bg-amber-400"
          >
            {spinning ? <RefreshCw className="h-5 w-5 animate-spin" /> : `SPIN ($${totalWager})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
