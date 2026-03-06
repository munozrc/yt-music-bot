import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Container } from "@/config/container";

import type { SlashCommand } from "../handlers/SlashCommand";

export class LeaveCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName("leave")
    .setDescription(
      "Disconnect the bot from the voice channel and clear the queue",
    );

  async execute(
    interaction: ChatInputCommandInteraction,
    container: Container,
  ): Promise<void> {
    // Validate bot is actually in a voice channel
    const member = interaction.member as GuildMember;
    const botVoiceChannel = interaction.guild?.members.me?.voice.channel;

    if (!botVoiceChannel) {
      await interaction.reply({
        content: "❌ I'm not in a voice channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // optional: check user is in the same channel as the bot
    const userVoiceChannel = member.voice.channel;
    if (!userVoiceChannel || userVoiceChannel.id !== botVoiceChannel.id) {
      await interaction.reply({
        content: "❌ You need to be in the same voice channel as me.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.guildId) {
      await interaction.reply({
        content: "❌ Guild ID is missing in the interaction.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    //  Call use case
    await container.leave.execute({
      guildId: interaction.guildId,
      reason: "manual",
    });

    await interaction.reply("👋 Disconnected and queue cleared.");
  }
}
