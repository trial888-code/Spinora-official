import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

loadEnv();

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const userId = "c1931a25-745b-42aa-a3d4-857d267cdf31";

async function verifyDepositsData() {
  console.log("=== Verifying User Deposits & Credits Timeline ===");

  const [{ data: deposits }, { data: txDeposits }] = await Promise.all([
    db
      .from("deposit_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    db
      .from("wallet_transactions")
      .select("id, amount, transaction_type, source, description, created_at")
      .eq("user_id", userId)
      .in("transaction_type", ["credit", "adjustment"])
      .order("created_at", { ascending: false }),
  ]);

  const reqs = (deposits ?? []).map((d) => ({
    Source: d.payment_method || "crypto/ticket",
    Amount: `$${d.amount}`,
    Status: d.status,
    Time: d.created_at,
  }));

  const txs = (txDeposits ?? []).map((t) => ({
    Source: t.source || "deposit",
    Amount: `$${t.amount}`,
    Status: "completed",
    Time: t.created_at,
  }));

  const combined = [...reqs, ...txs];
  combined.sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());

  console.log(`✅ Total Combined Deposit & Credit History: ${combined.length} items:`);
  console.table(combined);
}

verifyDepositsData();
