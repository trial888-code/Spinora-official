import { readFileSync } from "node:fs";

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGeminiPrompt() {
  console.log("Testing Gemini Vision prompt instructions...");
  console.log("API Key configured:", Boolean(GEMINI_API_KEY));
}

testGeminiPrompt();
