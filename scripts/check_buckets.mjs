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
  } catch {
    /* ignore */
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(supabaseUrl, supabaseKey);

async function checkAndCreateBucket() {
  console.log("=== Checking Supabase Storage Buckets ===");
  const { data: buckets, error } = await db.storage.listBuckets();
  if (error) {
    console.error("Error listing buckets:", error.message);
    return;
  }

  console.log("Current buckets:", buckets.map((b) => b.name).join(", ") || "(none)");
  const hasChat = buckets.some((b) => b.name === "chat-attachments");

  if (!hasChat) {
    console.log("Creating 'chat-attachments' bucket...");
    const { data, error: createErr } = await db.storage.createBucket("chat-attachments", {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });
    if (createErr) {
      console.error("Failed to create bucket 'chat-attachments':", createErr.message);
    } else {
      console.log("Successfully created public storage bucket 'chat-attachments'!");
    }
  } else {
    console.log("Bucket 'chat-attachments' already exists.");
  }
}

checkAndCreateBucket();
