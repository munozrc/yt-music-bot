import { getVoiceConnections } from "@discordjs/voice";
import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../../types/command.types";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skip the current song");

export async function execute(
  interaction: Parameters<SlashCommand["execute"]>[0],
  client: Parameters<SlashCommand["execute"]>[1],
): Promise<void> {
  if (!interaction.isChatInputCommand()) {
    logger.info(`Register interaction ${interaction.commandName}`);
    return;
  }

  try {
    const numberOfConnections = getVoiceConnections().size;
    if (numberOfConnections === 0) {
      logger.error("Bot without voice channel");
      await interaction.reply("You must invite the bot to a voice channel");
      return;
    }

    client.player.skip();
    await interaction.reply("⏭️ Skipped to the next song!");
  } catch (error) {
    logger.error("Failed to execute /skip command", error);
    const errorMessage = "❌ Could not skip the current song.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
