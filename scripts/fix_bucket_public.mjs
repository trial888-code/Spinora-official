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

async function fixBucket() {
  console.log("=== Checking and Updating Storage Bucket 'chat-attachments' ===");

  const { data: bucket, error: getErr } = await db.storage.getBucket("chat-attachments");
  console.log("Current bucket details:", bucket, "Get error:", getErr);

  // Update bucket to public = true
  const { data: updated, error: updateErr } = await db.storage.updateBucket("chat-attachments", {
    public: true,
    fileSizeLimit: 10485760,
  });

  console.log("Update bucket result:", updated, "Update error:", updateErr);

  // Test public URL fetch again
  const testUrl = "https://muetgtzcbecsqigtpfyn.supabase.co/storage/v1/object/public/chat-attachments/deposit-proofs/c1931a25-745b-42aa-a3d4-857d267cdf31/fe1be491-9cac-4772-939e-f28c1251b61c.png";
  const res = await fetch(testUrl);
  console.log("Public URL fetch status:", res.status, res.statusText);
  if (res.status !== 200) {
    console.log("Response text:", await res.text());
  } else {
    console.log("Public URL is now working! Content-Type:", res.headers.get("content-type"));
  }
}

fixBucket();
