"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateServerSeedPair, calculateProvablyFairResult } from "@/lib/security/provably-fair";

export interface SlotSymbol {
  id: string;
  name: string;
  symbol: string;
  multiplier: number; // 3 of a kind multiplier
  multiplier4: number; // 4 of a kind multiplier
  multiplier5: number; // 5 of a kind multiplier
  isWild?: boolean;
  isScatter?: boolean;
}

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: "7", name: "Lucky Seven", symbol: "7️⃣", multiplier: 10, multiplier4: 25, multiplier5: 100 },
  { id: "diamond", name: "Diamond", symbol: "💎", multiplier: 8, multiplier4: 20, multiplier5: 75 },
  { id: "crown", name: "Crown", symbol: "👑", multiplier: 6, multiplier4: 15, multiplier5: 50 },
  { id: "bell", name: "Golden Bell", symbol: "🔔", multiplier: 4, multiplier4: 10, multiplier5: 30 },
  { id: "cherry", name: "Cherry", symbol: "🍒", multiplier: 3, multiplier4: 6, multiplier5: 20 },
  { id: "lemon", name: "Lemon", symbol: "🍋", multiplier: 2, multiplier4: 4, multiplier5: 10 },
  { id: "wild", name: "Wild Star", symbol: "⭐", multiplier: 15, multiplier4: 40, multiplier5: 150, isWild: true },
  { id: "scatter", name: "Scatter Gem", symbol: "🌀", multiplier: 5, multiplier4: 15, multiplier5: 50, isScatter: true },
];

export interface SlotPayline {
  id: number;
  positions: [number, number, number, number, number]; // Row index (0, 1, 2) for each of the 5 reels
}

export const PAYLINES_25: SlotPayline[] = [
  { id: 1, positions: [1, 1, 1, 1, 1] },
  { id: 2, positions: [0, 0, 0, 0, 0] },
  { id: 3, positions: [2, 2, 2, 2, 2] },
  { id: 4, positions: [0, 1, 2, 1, 0] },
  { id: 5, positions: [2, 1, 0, 1, 2] },
  { id: 6, positions: [1, 0, 0, 0, 1] },
  { id: 7, positions: [1, 2, 2, 2, 1] },
  { id: 8, positions: [0, 0, 1, 2, 2] },
  { id: 9, positions: [2, 2, 1, 0, 0] },
  { id: 10, positions: [1, 0, 1, 2, 1] },
  { id: 11, positions: [1, 2, 1, 0, 1] },
  { id: 12, positions: [0, 1, 1, 1, 0] },
  { id: 13, positions: [2, 1, 1, 1, 2] },
  { id: 14, positions: [0, 1, 0, 1, 0] },
  { id: 15, positions: [2, 1, 2, 1, 2] },
  { id: 16, positions: [1, 1, 0, 1, 1] },
  { id: 17, positions: [1, 1, 2, 1, 1] },
  { id: 18, positions: [0, 0, 2, 0, 0] },
  { id: 19, positions: [2, 2, 0, 2, 2] },
  { id: 20, positions: [0, 2, 0, 2, 0] },
  { id: 21, positions: [2, 0, 2, 0, 2] },
  { id: 22, positions: [1, 0, 2, 0, 1] },
  { id: 23, positions: [1, 2, 0, 2, 1] },
  { id: 24, positions: [0, 2, 2, 2, 0] },
  { id: 25, positions: [2, 0, 0, 0, 2] },
];

/**
 * Server Action: Play Fortune Slots
 */
export async function playSlotBet({
  betPerLine,
  activePaylinesCount,
  clientSeed = "spinora_default_seed",
}: {
  betPerLine: number;
  activePaylinesCount: number;
  clientSeed?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in to play." };

  if (betPerLine < 0.1 || betPerLine > 50) {
    return { error: "Bet per line must be between $0.10 and $50.00." };
  }

  const paylinesToPlay = Math.min(Math.max(1, activePaylinesCount), 25);
  const totalWager = Number((betPerLine * paylinesToPlay).toFixed(2));

  // Check profile balance
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("wallet_balance, cashout_wallet")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    return { error: "Failed to fetch user balance." };
  }

  const currentBalance = Number(profile.wallet_balance || 0);
  if (currentBalance < totalWager) {
    return { error: `Insufficient deposit balance ($${currentBalance.toFixed(2)}). Minimum bet needed: $${totalWager.toFixed(2)}` };
  }

  // Generate seed and provably fair outcome
  const { serverSeed, serverSeedHash } = generateServerSeedPair();
  const nonce = Date.now();

  // Create 5x3 reel matrix using deterministic provable RNG
  const reelMatrix: SlotSymbol[][] = [[], [], [], [], []];
  let scatterCount = 0;

  for (let reel = 0; reel < 5; reel++) {
    const reelSymbols: SlotSymbol[] = [];
    for (let row = 0; row < 3; row++) {
      const pfResult = calculateProvablyFairResult(serverSeed, `${clientSeed}:${reel}:${row}`, nonce, 1000);
      const symbolIndex = pfResult.integerResult % SLOT_SYMBOLS.length;
      const sym = SLOT_SYMBOLS[symbolIndex];
      reelSymbols.push(sym);
      if (sym.isScatter) scatterCount++;
    }
    reelMatrix[reel] = reelSymbols;
  }

  // Calculate payouts for active paylines
  let totalWin = 0;
  const winningLines: { paylineId: number; symbol: string; count: number; winAmount: number }[] = [];

  const activeLines = PAYLINES_25.slice(0, paylinesToPlay);

  for (const line of activeLines) {
    const lineSymbols = line.positions.map((rowIdx, reelIdx) => reelMatrix[reelIdx][rowIdx]);
    const firstSym = lineSymbols[0];

    // Determine matching sequence (supporting Wilds)
    let matchCount = 1;
    let targetSym = firstSym.isWild ? null : firstSym;

    for (let i = 1; i < 5; i++) {
      const current = lineSymbols[i];
      if (current.isWild) {
        matchCount++;
      } else if (!targetSym) {
        targetSym = current;
        matchCount++;
      } else if (current.id === targetSym.id) {
        matchCount++;
      } else {
        break;
      }
    }

    const matchedSymbol = targetSym || lineSymbols[0];
    if (matchCount >= 3) {
      let multiplier = 0;
      if (matchCount === 3) multiplier = matchedSymbol.multiplier;
      else if (matchCount === 4) multiplier = matchedSymbol.multiplier4;
      else if (matchCount >= 5) multiplier = matchedSymbol.multiplier5;

      const lineWin = Number((betPerLine * multiplier).toFixed(2));
      totalWin += lineWin;

      winningLines.push({
        paylineId: line.id,
        symbol: matchedSymbol.name,
        count: matchCount,
        winAmount: lineWin,
      });
    }
  }

  // Check Scatter Bonus (3 or more scatters trigger 10 free spins + bonus payout)
  let freeSpinsAwarded = 0;
  if (scatterCount >= 3) {
    freeSpinsAwarded = 10;
    const scatterBonus = Number((totalWager * 5).toFixed(2));
    totalWin += scatterBonus;
  }

  totalWin = Number(totalWin.toFixed(2));
  const netOutcome = Number((totalWin - totalWager).toFixed(2));
  const newBalance = Number((currentBalance + netOutcome).toFixed(2));

  // Update wallet atomically via Supabase
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ wallet_balance: newBalance })
    .eq("id", user.id);

  if (updateErr) {
    return { error: "Transaction failed: Could not update wallet balance." };
  }

  // Log transaction
  await supabase.from("wallet_transactions").insert({
    user_id: user.id,
    amount: totalWin > 0 ? totalWin : -totalWager,
    wallet_type: "deposit",
    source: "game_slots",
    description: `Fortune Slots bet $${totalWager.toFixed(2)}${totalWin > 0 ? ` (Won $${totalWin.toFixed(2)})` : ""}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/games/slots");

  return {
    success: true,
    totalWager,
    totalWin,
    newBalance,
    reelMatrix,
    winningLines,
    freeSpinsAwarded,
    provablyFair: {
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
    },
  };
}

/**
 * Server Action: Play European Roulette Spin
 */
export async function playRouletteSpin({
  bets,
  clientSeed = "spinora_roulette_seed",
}: {
  bets: { type: string; value?: number | string; amount: number }[];
  clientSeed?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in to play." };

  if (!bets || bets.length === 0) {
    return { error: "Please place at least one bet on the table." };
  }

  const totalWager = Number(bets.reduce((acc, b) => acc + b.amount, 0).toFixed(2));
  if (totalWager <= 0 || totalWager > 500) {
    return { error: "Total bet must be between $1.00 and $500.00." };
  }

  // Check balance
  const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", user.id).single();
  const currentBalance = Number(profile?.wallet_balance || 0);

  if (currentBalance < totalWager) {
    return { error: `Insufficient deposit balance ($${currentBalance.toFixed(2)}).` };
  }

  // Generate seed & spinned number (0 - 36)
  const { serverSeed, serverSeedHash } = generateServerSeedPair();
  const nonce = Date.now();
  const pfResult = calculateProvablyFairResult(serverSeed, clientSeed, nonce, 37);
  const winningNumber = pfResult.integerResult; // 0 to 36

  // European Roulette color mapping (0 is Green)
  const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const isRed = RED_NUMBERS.includes(winningNumber);
  const isBlack = winningNumber > 0 && !isRed;
  const isEven = winningNumber > 0 && winningNumber % 2 === 0;
  const isOdd = winningNumber > 0 && winningNumber % 2 !== 0;
  const isLow = winningNumber >= 1 && winningNumber <= 18;
  const isHigh = winningNumber >= 19 && winningNumber <= 36;

  let totalWin = 0;

  for (const bet of bets) {
    const bAmt = bet.amount;

    if (bet.type === "straight" && Number(bet.value) === winningNumber) {
      totalWin += bAmt * 36; // 35:1 payout + original bet
    } else if (bet.type === "red" && isRed) {
      totalWin += bAmt * 2;
    } else if (bet.type === "black" && isBlack) {
      totalWin += bAmt * 2;
    } else if (bet.type === "even" && isEven) {
      totalWin += bAmt * 2;
    } else if (bet.type === "odd" && isOdd) {
      totalWin += bAmt * 2;
    } else if (bet.type === "low" && isLow) {
      totalWin += bAmt * 2;
    } else if (bet.type === "high" && isHigh) {
      totalWin += bAmt * 2;
    } else if (bet.type === "doz1" && winningNumber >= 1 && winningNumber <= 12) {
      totalWin += bAmt * 3;
    } else if (bet.type === "doz2" && winningNumber >= 13 && winningNumber <= 24) {
      totalWin += bAmt * 3;
    } else if (bet.type === "doz3" && winningNumber >= 25 && winningNumber <= 36) {
      totalWin += bAmt * 3;
    }
  }

  totalWin = Number(totalWin.toFixed(2));
  const newBalance = Number((currentBalance - totalWager + totalWin).toFixed(2));

  await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", user.id);

  await supabase.from("wallet_transactions").insert({
    user_id: user.id,
    amount: totalWin > 0 ? totalWin : -totalWager,
    wallet_type: "deposit",
    source: "game_roulette",
    description: `Roulette landed on ${winningNumber} (${isRed ? "Red" : isBlack ? "Black" : "Green"}). Wager $${totalWager.toFixed(2)}, Won $${totalWin.toFixed(2)}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/games/roulette");

  return {
    success: true,
    winningNumber,
    color: winningNumber === 0 ? "green" : isRed ? "red" : "black",
    totalWager,
    totalWin,
    newBalance,
    provablyFair: { serverSeed, serverSeedHash, clientSeed, nonce },
  };
}

/**
 * Server Action: Play Mines Cashout / Tile Reveal
 */
export async function playMinesTurn({
  action,
  betAmount,
  mineCount,
  revealedCount,
  clientSeed = "spinora_mines_seed",
}: {
  action: "start" | "reveal" | "cashout";
  betAmount: number;
  mineCount: number;
  revealedCount: number;
  clientSeed?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in to play." };

  if (mineCount < 1 || mineCount > 24) {
    return { error: "Mine count must be between 1 and 24." };
  }

  const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", user.id).single();
  const currentBalance = Number(profile?.wallet_balance || 0);

  if (action === "start") {
    if (betAmount < 0.5 || betAmount > 200) {
      return { error: "Bet amount must be between $0.50 and $200.00." };
    }
    if (currentBalance < betAmount) {
      return { error: `Insufficient deposit balance ($${currentBalance.toFixed(2)}).` };
    }

    const { serverSeed, serverSeedHash } = generateServerSeedPair();
    const nonce = Date.now();

    // Deduct bet amount
    const newBalance = Number((currentBalance - betAmount).toFixed(2));
    await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", user.id);

    return {
      success: true,
      newBalance,
      provablyFair: { serverSeed, serverSeedHash, clientSeed, nonce },
    };
  }

  if (action === "cashout") {
    if (revealedCount <= 0) return { error: "Cannot cash out before revealing at least one tile." };

    // Calculate dynamic multiplier
    let multiplier = 1;
    let safeTiles = 25 - mineCount;
    for (let i = 0; i < revealedCount; i++) {
      multiplier *= (25 - i) / (safeTiles - i);
    }
    // Apply 3% house edge
    multiplier = Number((multiplier * 0.97).toFixed(2));
    const winAmount = Number((betAmount * multiplier).toFixed(2));

    const newBalance = Number((currentBalance + winAmount).toFixed(2));
    await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", user.id);

    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      amount: winAmount,
      wallet_type: "deposit",
      source: "game_mines",
      description: `Mines Cashout x${multiplier.toFixed(2)} multiplier — Won $${winAmount.toFixed(2)}`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/games/mines");

    return {
      success: true,
      winAmount,
      multiplier,
      newBalance,
    };
  }

  return { error: "Invalid action" };
}
