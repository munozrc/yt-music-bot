import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Container } from "@/config/container";

import type { SlashCommand } from "../handlers/SlashCommand";

export class StopCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback and clear the queue (bot stays in channel)");

  async execute(
    interaction: ChatInputCommandInteraction,
    container: Container,
  ): Promise<void> {
    const member = interaction.member as GuildMember;
    const botVoiceChannel = interaction.guild?.members.me?.voice.channel;

    if (!botVoiceChannel) {
      await interaction.reply({
        content: "❌ I'm not in a voice channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (member.voice.channel?.id !== botVoiceChannel.id) {
      await interaction.reply({
        content: "❌ You need to be in the same voice channel as me.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await container.stop.execute({
      guildId: interaction.guildId as string,
    });

    await interaction.reply(
      "⏹️ Stopped and queue cleared. Still in the channel — use `/play` to start again or `/leave` to disconnect.",
    );
  }
}
