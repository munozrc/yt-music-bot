import {
  type CommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription(
    "Displays a list of all available commands and their descriptions.",
  );

export async function execute(interaction: CommandInteraction): Promise<void> {
  try {
    const helpMessage = `
      🎵 **YT Music Bot Commands** 🎵

      **/play <song>** – Plays a song from YouTube.
      **/skip** – Skips the current song.
      **/stop** – Stops playback and clears the queue.
      **/queue** – Shows the current queue.
      **/ping** – Replies with Pong!
      **/help** – Shows this help message.
    `;

    await interaction.reply({
      content: helpMessage,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error("Failed to execute /help command", error);
    throw new Error(
      "An unexpected error occurred while executing the help command.",
    );
  }
}
