import { Interaction, MessageFlags } from "discord.js";

import { ApplicationClient } from "../app";
import { logger } from "../utils/logger";

export async function handleInteractionCreate(
  client: ApplicationClient,
  interaction: Interaction,
) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Command "${interaction.commandName}" not found.`);
    await interaction.reply({
      content: "This command is not available.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await command.execute(interaction, client);
  } catch (error) {
    logger.error(`Error executing ${interaction.commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "An error occurred while executing this command.",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "An error occurred while executing this command.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
