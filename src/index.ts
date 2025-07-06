import { logger } from "./utils/logger";
import { ApplicationClient } from "./app";

(async () => {
  try {
    const app = new ApplicationClient();
    await app.start();
  } catch (error) {
    logger.error("Failed to start the bot:", error);
    process.exit(1);
  }
})();
