import { getVoiceConnection } from "@discordjs/voice";
import { InteractionResponse, SlashCommandBuilder } from "discord.js";

import { SlashCommand } from "../../types/command.types";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("leave")
  .setDescription("Disconnect the bot from the voice channel");

export async function execute(
  interaction: Parameters<SlashCommand["execute"]>[0],
  client: Parameters<SlashCommand["execute"]>[1],
): Promise<InteractionResponse<boolean> | void> {
  if (!interaction.isChatInputCommand()) {
    logger.info(`Register interaction ${interaction.commandName}`);
    return;
  }

  const { guild } = interaction;
  if (!guild) {
    logger.warn("Received /leave interaction outside of a guild");
    return await interaction.reply(
      "❌ This command can only be used in a server.",
    );
  }

  try {
    const connection = getVoiceConnection(guild.id);
    if (!connection) {
      logger.info(`Bot is not connected to any voice channel in ${guild.name}`);
      return await interaction.reply(
        "ℹ️ I'm not connected to any voice channel.",
      );
    }

    const channelName =
      guild.channels.cache.get(connection.joinConfig.channelId ?? "")?.name ||
      "a voice channel";

    client.player.disconnect();
    await interaction.reply(`👋 Disconnected from **#${channelName}**`);

    logger.success(`Bot disconnected from #${channelName} in #${guild.name}`);
  } catch (error) {
    logger.error(`Error executing /leave in ${guild.name}`, error);

    const errorMessage =
      "❌ There was an error trying to disconnect from the voice channel.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
