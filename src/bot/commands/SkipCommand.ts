import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Container } from "@/config/container";

import type { SlashCommand } from "../handlers/SlashCommand";

export class SkipCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current track");

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

    const result = await container.skipTrack.execute({
      guildId: interaction.guildId as string,
      requestedBy: interaction.user.id,
    });

    if (result.next) {
      await interaction.reply(
        `⏭️ Skipped. Now playing: **${result.next.title}**`,
      );
    } else {
      await interaction.reply("⏭️ Skipped. The queue is now empty.");
    }
  }
}
