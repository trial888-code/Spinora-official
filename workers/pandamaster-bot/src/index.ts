import "dotenv/config";
import { runBotWorker } from "../../shared/create-bot-worker.js";
import { botPollIntervalMs } from "../../shared/fast-panel-login.js";
import { ensurePanelLoggedIn, runJob } from "./bot.js";

runBotWorker({
  botLabel: "pandamaster-bot",
  gameSlug: "panda-master",
  pollMs: botPollIntervalMs("PANDAMASTER_POLL_MS"),
  envPathHint: "workers/pandamaster-bot/.env",
  ensurePanelLoggedIn,
  runJob,
}).catch((err) => {
  console.error("[pandamaster-bot] Fatal:", err);
  process.exit(1);
});
