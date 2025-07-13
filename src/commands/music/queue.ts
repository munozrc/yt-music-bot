import {
  ContainerBuilder,
  InteractionResponse,
  MessageFlags,
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
    const containerResponse = new ContainerBuilder().setAccentColor(0x0099ff);
    const queue = client.player.queue;

    if (queue.isEmpty) {
      containerResponse.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent("📭 The queue is currently empty."),
      );

      return await interaction.reply({
        components: [containerResponse],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    containerResponse.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`**Current Queue**\n${queue.toString()}`),
    );

    await interaction.reply({
      components: [containerResponse],
      flags: MessageFlags.IsComponentsV2,
    });
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
