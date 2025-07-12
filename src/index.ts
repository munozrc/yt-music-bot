import { generateDependencyReport } from "@discordjs/voice";

import { ApplicationClient } from "./app";
import { logger } from "./utils/logger";

(async () => {
  try {
    const app = new ApplicationClient();

    logger.debug(generateDependencyReport());
    await app.start();
  } catch (error) {
    logger.error("Failed to start the bot:", error);
    process.exit(1);
  }
})();
