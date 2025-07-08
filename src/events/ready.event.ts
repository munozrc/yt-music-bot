import { Client } from "discord.js";

import { logger } from "../utils/logger";

export async function handleIsReady(client: Client): Promise<void> {
  logger.success(`Bot is online as ${client.user?.tag}`);
}
