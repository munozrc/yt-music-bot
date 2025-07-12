import { generateDependencyReport } from "@discordjs/voice";

import { ApplicationClient } from "./app";
import { logger } from "./utils/logger";

(async () => {
  logger.info("🚀 Starting Discord bot...");

  if (process.env.NODE_ENV !== "production") {
    logger.debug("🧪 Discord.js Voice dependency report:");
    logger.debug(generateDependencyReport());
  }

  try {
    const app = new ApplicationClient();
    await app.start();
  } catch (error) {
    logger.error("❌ Failed to start the bot:", error);
    process.exit(1);
  }
})();
