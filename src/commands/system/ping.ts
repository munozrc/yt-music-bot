import { SlashCommandBuilder } from "discord.js";

import { SlashCommand } from "../../types/command.types";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with pong!");

export async function execute(
  interaction: Parameters<SlashCommand["execute"]>[0],
): Promise<void> {
  try {
    await interaction.reply("Pong!");
  } catch (error) {
    logger.error("Failed to execute /ping command", error);

    const errorMessage =
      "❌ An unexpected error occurred while executing the ping command.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
