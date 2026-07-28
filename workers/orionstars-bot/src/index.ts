import "dotenv/config";
import { runBotWorker } from "../../shared/create-bot-worker.js";
import { botPollIntervalMs } from "../../shared/fast-panel-login.js";
import { ensurePanelLoggedIn, runJob } from "./bot.js";

runBotWorker({
  botLabel: "orionstars-bot",
  gameSlug: "orion-stars",
  pollMs: botPollIntervalMs("ORIONSTARS_POLL_MS"),
  envPathHint: "workers/orionstars-bot/.env",
  ensurePanelLoggedIn,
  runJob,
}).catch((err) => {
  console.error("[orionstars-bot] Fatal:", err);
  process.exit(1);
});
