import { getVoiceConnections } from "@discordjs/voice";
import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../../types/command.types";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("volume")
  .setDescription("Change the playback volume")
  .addIntegerOption((option) =>
    option
      .setName("level")
      .setDescription("Volume level (0-100)")
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(100),
  );

export async function execute(
  interaction: Parameters<SlashCommand["execute"]>[0],
  client: Parameters<SlashCommand["execute"]>[1],
): Promise<void> {
  if (!interaction.isChatInputCommand()) {
    logger.info(`Register interaction ${interaction.commandName}`);
    return;
  }

  const level = interaction.options.getInteger("level", true);
  const normalizedVolume = level / 100;

  try {
    const numberOfConnections = getVoiceConnections().size;
    if (numberOfConnections === 0) {
      logger.error("Bot without voice channel");
      await interaction.reply("You must invite the bot to a voice channel");
      return;
    }

    client.player.setVolume(normalizedVolume);
    await interaction.reply(`🔊 Volume set to **${level}%**`);
  } catch (error) {
    logger.error("Failed to execute /volume command", error);
    const errorMessage = "❌ Could not change the volume.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
