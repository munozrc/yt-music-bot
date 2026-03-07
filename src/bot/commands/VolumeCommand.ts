import {
  type ChatInputCommandInteraction,
  type GuildMember,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Container } from "@/config/container";

import type { SlashCommand } from "../handlers/SlashCommand";

export class VolumeCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set the playback volume (0–200)")
    .addIntegerOption((opt) =>
      opt
        .setName("level")
        .setDescription("Volume level (0–200, default 10)")
        .setMinValue(0)
        .setMaxValue(200)
        .setRequired(true),
    );

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

    const level = interaction.options.getInteger("level", true);

    await container.setVolume.execute({
      guildId: interaction.guildId as string,
      volume: level,
    });

    const bar = volumeBar(level);
    await interaction.reply(`🔊 Volume set to **${level}%** ${bar}`);
  }
}

function volumeBar(volume: number): string {
  const filled = Math.round(volume / 20); // 0–10 blocks
  return "█".repeat(filled) + "░".repeat(10 - filled);
}
