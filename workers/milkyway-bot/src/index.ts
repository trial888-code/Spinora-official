import "dotenv/config";
import { runBotWorker } from "../../shared/create-bot-worker.js";
import { botPollIntervalMs } from "../../shared/fast-panel-login.js";
import { ensurePanelLoggedIn, runJob } from "./bot.js";

runBotWorker({
  botLabel: "milkyway-bot",
  gameSlug: "milky-way",
  pollMs: botPollIntervalMs("MILKYWAY_POLL_MS"),
  envPathHint: "workers/milkyway-bot/.env",
  ensurePanelLoggedIn,
  runJob,
}).catch((err) => {
  console.error("[milkyway-bot] Fatal:", err);
  process.exit(1);
});
