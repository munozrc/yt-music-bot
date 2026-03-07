import { generateDependencyReport } from "@discordjs/voice";
import { Events, REST, Routes } from "discord.js";

import {
  LeaveCommand,
  LoopCommand,
  PlayCommand,
  QueueCommand,
  ResumeCommand,
  SkipCommand,
  StopCommand,
  VolumeCommand,
} from "./bot/commands";
import { CommandHandler } from "./bot/handlers/CommandHandler";
import { buildContainer } from "./config/container";
import { env } from "./config/env";
import { logger } from "./config/logger";

async function main() {
  const container = await buildContainer();

  // Generate and log the Discord.js Voice dependency report for debugging purposes
  logger.debug("🧪 Discord.js Voice dependency report:");
  logger.debug(`\n${generateDependencyReport()}`);

  // Register slash commands
  const commandHandler = new CommandHandler(container);
  commandHandler.register(
    new PlayCommand(),
    new LeaveCommand(),
    new SkipCommand(),
    new StopCommand(),
    new QueueCommand(),
    new VolumeCommand(),
    new LoopCommand(),
    new ResumeCommand(),
  );

  const rest = new REST().setToken(env.DISCORD_TOKEN);
  const isDebug = env.DEBUG === "true";

  // Use guild-specific commands in debug mode for faster updates, and global commands in production
  const route = isDebug
    ? Routes.applicationGuildCommands(env.CLIENT_ID, env.SERVER_ID)
    : Routes.applicationCommands(env.CLIENT_ID);

  await rest.put(route, {
    body: commandHandler.toJSON(),
  });

  logger.success("✅ Slash commands registered with Discord API");

  container.client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await commandHandler.handle(interaction);
  });

  container.client.once(Events.ClientReady, (client) => {
    logger.success(`✅ Logged in as ${client.user.tag}`);
  });

  await container.client.login(env.DISCORD_TOKEN);
}

// Start the bot and catch any unhandled errors during startup
main().catch((err) => {
  logger.error("Fatal error during startup:", err);
  process.exit(1);
});
