import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(supabaseUrl, supabaseKey);

const CATALOG_GAMES = [
  { name: "Fire Kirin", slug: "fire-kirin", image_url: "/games/fire-kirin.webp", play_url: "http://start.firekirin.xyz:8580/", download_url: "http://start.firekirin.xyz:8580/", description: "Fire Kirin fish arcade & slots", badge_text: "HOT", is_active: true, is_featured: true },
  { name: "Juwa", slug: "juwa", image_url: "/games/juwa.webp", play_url: "https://dl.juwa777.com/", download_url: "https://dl.juwa777.com/", description: "Juwa mobile casino slots & fish", badge_text: "POPULAR", is_active: true, is_featured: true },
  { name: "Orion Stars", slug: "orion-stars", image_url: "/games/orion-stars.webp", play_url: "http://start.orionstars.vip:8580/", download_url: "http://start.orionstars.vip:8580/", description: "Orion Stars arcade fish game", badge_text: "HOT", is_active: true, is_featured: true },
  { name: "Game Vault", slug: "game-vault", image_url: "/games/game-vault.webp", play_url: "https://download.gamevault999.com/", download_url: "https://download.gamevault999.com/", description: "Game Vault casino games", badge_text: "HOT", is_active: true, is_featured: true },
  { name: "Panda Master", slug: "panda-master", image_url: "/games/panda-master.webp", play_url: "https://pandamaster.vip:8888/", download_url: "https://pandamaster.vip:8888/", description: "Panda Master arcade slots", badge_text: "NEW", is_active: true, is_featured: false },
  { name: "Ultra Panda", slug: "ultrapanda", image_url: "/games/ultrapanda.webp", play_url: "https://www.ultrapanda.mobi/", download_url: "https://www.ultrapanda.mobi/", description: "Ultra Panda fish games", badge_text: "HOT", is_active: true, is_featured: false },
  { name: "Milky Way", slug: "milky-way", image_url: "/games/milky-way.webp", play_url: "https://milkywayapp.xyz/", download_url: "https://milkywayapp.xyz/", description: "Milky Way casino arcade", badge_text: "NEW", is_active: true, is_featured: false },
  { name: "VBlink", slug: "vblink", image_url: "/games/vblink.webp", play_url: "https://vblink777.club/", download_url: "https://vblink777.club/", description: "VBlink 777 slots arcade", badge_text: "NEW", is_active: true, is_featured: false },
];

async function syncGames() {
  console.log("=== Syncing All Catalog Games to Database ===");
  for (const g of CATALOG_GAMES) {
    const { data: existing } = await db.from("games").select("id").eq("slug", g.slug).maybeSingle();
    if (existing) {
      console.log(`- Game '${g.name}' already in DB.`);
    } else {
      const { error } = await db.from("games").insert(g);
      if (error) console.error(`Error inserting ${g.name}:`, error.message);
      else console.log(`✅ Inserted '${g.name}' into DB games table!`);
    }
  }
}

syncGames();
