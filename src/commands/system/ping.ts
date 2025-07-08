import { type CommandInteraction, SlashCommandBuilder } from "discord.js";

import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with pong!");

export async function execute(interaction: CommandInteraction): Promise<void> {
  try {
    await interaction.reply("Pong!");
  } catch (error) {
    logger.error("Failed to execute /ping command", error);
    throw new Error(
      "An unexpected error occurred while executing the ping command.",
    );
  }
}
