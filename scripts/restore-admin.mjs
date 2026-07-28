import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function loadEnv() {
  try {
    const text = fs.readFileSync(".env.local", "utf8");
    const env = {};
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        env[key] = value.trim();
      }
    }
    return env;
  } catch {
    return process.env;
  }
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

async function restoreAdmin() {
  console.log("Fetching profiles from Supabase...");
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching profiles:", error.message);
    return;
  }

  console.log(`Found ${profiles.length} profiles.`);
  const ids = profiles.map((p) => p.id);

  // 1. Restore 'admin' role to all profiles
  console.log("Restoring 'admin' role to profiles...");
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .in("id", ids);

  if (updateErr) {
    console.error("Failed to update profiles role:", updateErr.message);
  } else {
    console.log("✅ Successfully updated profiles role to 'admin'!");
  }

  // 2. Populate user_roles table with super_admin role
  const { data: roles } = await supabase.from("roles").select("id, key");
  const superAdminRole = roles?.find((r) => r.key === "super_admin" || r.key === "admin");

  if (superAdminRole && profiles.length > 0) {
    console.log(`Assigning role_id ${superAdminRole.id} (${superAdminRole.key}) in user_roles table...`);
    for (const p of profiles) {
      const { error: roleErr } = await supabase.from("user_roles").upsert({
        user_id: p.id,
        role_id: superAdminRole.id,
      });
      if (roleErr) {
        console.warn(`user_roles update notice for ${p.id}:`, roleErr.message);
      }
    }
    console.log("✅ user_roles table updated for all profiles!");
  }
}

restoreAdmin();
