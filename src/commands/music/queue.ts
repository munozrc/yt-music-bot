import {
  EmbedBuilder,
  InteractionResponse,
  SlashCommandBuilder,
} from "discord.js";

import { SlashCommand } from "../../types/command.types";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("queue")
  .setDescription("Show the current song queue");

export async function execute(
  interaction: Parameters<SlashCommand["execute"]>[0],
  client: Parameters<SlashCommand["execute"]>[1],
): Promise<InteractionResponse<boolean> | void> {
  if (!interaction.isChatInputCommand()) {
    logger.info(`Register interaction ${interaction.commandName}`);
    return;
  }

  try {
    const queue = client.player.queue;
    if (queue.isEmpty) {
      await interaction.reply("📭 The queue is currently empty.");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("🎶 Current Queue")
      .setDescription(queue.toString());

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error("Failed to execute /queue command", error);

    const errorMessage = "❌ Could not display the queue.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
