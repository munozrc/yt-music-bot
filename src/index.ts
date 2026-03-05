import { generateDependencyReport } from "@discordjs/voice";
import { Client, Events, GatewayIntentBits } from "discord.js";

import { logger } from "./infrastructure/logging/logger";
import { config } from "./infrastructure/system/config";

// Generate and log the Discord.js Voice dependency report for debugging purposes
logger.debug("🧪 Discord.js Voice dependency report:");
logger.debug(`\n${generateDependencyReport()}`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once(Events.ClientReady, () => {
  logger.success(`Bot is online as ${client.user?.tag}`);
  // Aquí registrarías los Slash Commands en Discord
});

logger.info("🚀 Starting Discord bot...");
client.login(config.DISCORD_TOKEN);
