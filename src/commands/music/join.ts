import { getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import {
  ContainerBuilder,
  InteractionResponse,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { SlashCommand } from "../../types/command.types";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("join")
  .setDescription("Join bot to a voice channel");

export async function execute(
  interaction: Parameters<SlashCommand["execute"]>[0],
  client: Parameters<SlashCommand["execute"]>[1],
): Promise<InteractionResponse<boolean> | void> {
  if (!interaction.isChatInputCommand()) {
    logger.info(`Register interaction ${interaction.commandName}`);
    return;
  }

  const { user, guild } = interaction;
  if (!guild) {
    logger.warn("Received /join interaction outside of a guild");
    return await interaction.reply(
      "❌ This command can only be used in a server.",
    );
  }

  try {
    const member = await guild.members.fetch(user.id);
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      logger.warn(`User @${member.user.tag} is not in a voice channel`);
      return await interaction.reply(
        "🎤 You must be in a voice channel to use this command.",
      );
    }

    if (!voiceChannel.joinable) {
      logger.warn(`Bot has no permission to join #${voiceChannel.name}`);
      return await interaction.reply(
        "❌ I don't have permission to join your voice channel.",
      );
    }

    const existingConnection = getVoiceConnection(guild.id);
    if (existingConnection) {
      if (existingConnection.joinConfig.channelId === voiceChannel.id) {
        logger.warn(`Bot is already connected to ${voiceChannel.name}`);
        return await interaction.reply(
          `✅ I'm already in **#${voiceChannel.name}**`,
        );
      } else {
        logger.warn(
          `Bot is connected to another channel, moving to #${voiceChannel.name}`,
        );
        existingConnection.destroy();
      }
    }

    if (existingConnection?.state.status === "destroyed") {
      logger.info("Previous voice connection was destroyed, creating new one");
    }

    const voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    client.player.joinVoiceChannel(voiceConnection);

    const containerResponse = new ContainerBuilder()
      .setAccentColor(0x0099ff)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`✅ I joined **#${voiceChannel.name}**`),
      );

    await interaction.reply({
      components: [containerResponse],
      flags: MessageFlags.IsComponentsV2,
    });

    logger.success(`connection success to #${voiceChannel.name}`);
  } catch (error) {
    logger.error(
      `Error executing /join in ${guild.name} by @${user.tag}`,
      error,
    );

    const errorMessage =
      "❌ There was an error trying to join your voice channel.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
