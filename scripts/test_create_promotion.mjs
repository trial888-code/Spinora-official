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

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCreate() {
  console.log("Testing direct promotion insertion into Supabase...");
  
  const payload = {
    title: "Freeplay Available Today",
    description: "Exclusive freeplay promotion active now",
    code: "FREE20",
    bonus_percent: 20,
    is_active: true,
  };

  const { data, error } = await db.from("promotions").insert(payload).select("id").single();
  if (error) {
    console.error("Insertion error:", error.message);
  } else {
    console.log("🎉 SUCCESS! Inserted promotion with ID:", data.id);
  }
}

testCreate();
