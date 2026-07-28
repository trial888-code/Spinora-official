import "dotenv/config";
import { runBotWorker } from "../../shared/create-bot-worker.js";
import { botPollIntervalMs } from "../../shared/fast-panel-login.js";
import { ensurePanelLoggedIn, runJob } from "./bot.js";

runBotWorker({
  botLabel: "firekirin-bot",
  gameSlug: "fire-kirin",
  pollMs: botPollIntervalMs("FIREKIRIN_POLL_MS"),
  envPathHint: "workers/firekirin-bot/.env",
  ensurePanelLoggedIn,
  runJob,
}).catch((err) => {
  console.error("[firekirin-bot] Fatal:", err);
  process.exit(1);
});
