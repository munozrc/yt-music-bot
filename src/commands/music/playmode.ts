import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../../types/command.types";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("playmode")
  .setDescription("Change the player's playback mode")
  .addStringOption((option) =>
    option
      .setName("mode")
      .setDescription("Playback mode")
      .setRequired(true)
      .addChoices(
        { name: "Normal", value: "normal" },
        { name: "Autoplay", value: "autoplay" },
      ),
  );

export async function execute(
  interaction: Parameters<SlashCommand["execute"]>[0],
  client: Parameters<SlashCommand["execute"]>[1],
): Promise<void> {
  if (!interaction.isChatInputCommand()) {
    logger.info(`Register interaction ${interaction.commandName}`);
    return;
  }

  const mode = interaction.options.getString("mode", true) as
    | "normal"
    | "autoplay";

  try {
    client.player.setMode(mode);

    await interaction.reply(`✅ Playback mode set to **${mode}**.`);
    logger.info(`Playback mode changed to: ${mode}`);
  } catch (error) {
    logger.error("Failed to set playback mode", error);
    const errorMessage = "❌ Could not change the playback mode.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
