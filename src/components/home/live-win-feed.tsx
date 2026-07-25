"use client";

import { useState, useEffect } from "react";

interface LiveWin {
  id: string;
  user: string;
  amount: number;
  game: string;
}

const MOCK: LiveWin[] = [
  { id: "1", user: "username123", amount: 1250, game: "Juwa 777" },
  { id: "2", user: "CryptoKing", amount: 890, game: "Fire Kirin" },
  { id: "3", user: "SpinMaster", amount: 420, game: "Game Vault" },
];

/** Mockup-style horizontal live winner ticker */
export function LiveWinFeed() {
  const [wins, setWins] = useState(MOCK);

  useEffect(() => {
    const t = setInterval(() => {
      const users = ["VIP_Player", "LuckySpin", "JuwaMaster", "FirePro99"];
      const games = ["Juwa 777", "Fire Kirin", "Orion Stars", "Game Vault"];
      setWins((prev) => [
        {
          id: String(Date.now()),
          user: users[Math.floor(Math.random() * users.length)],
          amount: Math.floor(100 + Math.random() * 2000),
          game: games[Math.floor(Math.random() * games.length)],
        },
        ...prev.slice(0, 4),
      ]);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="cosmic-live-ticker overflow-hidden rounded-xl border border-purple-500/30 bg-[#0a0418]/80 py-2.5 px-4">
      <div className="flex animate-marquee gap-12 whitespace-nowrap text-sm">
        {[...wins, ...wins].map((w, i) => (
          <span key={`${w.id}-${i}`} className="text-purple-200/90">
            <span className="font-bold text-white">{w.user}</span> just won{" "}
            <span className="font-black text-amber-400">${w.amount.toLocaleString()} USDT</span> on{" "}
            <span className="font-bold text-cyan-300">{w.game}</span>!
          </span>
        ))}
      </div>
    </div>
  );
}
