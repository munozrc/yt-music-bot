import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";

import type { Container } from "@/config/container";

import type { SlashCommand } from "../handlers/SlashCommand";

export class PlayCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song or add it to the queue")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("YouTube URL or search term")
        .setRequired(true),
    );

  async execute(
    interaction: ChatInputCommandInteraction,
    container: Container,
  ): Promise<void> {
    await interaction.deferReply();

    // Validate user is in a voice channel
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await interaction.editReply(
        "❌ You need to be in a voice channel first.",
      );
      return;
    }

    // Build command DTO — only IDs, no Discord objects
    const query = interaction.options.getString("query", true);

    if (!interaction.guildId) {
      await interaction.editReply("❌ Guild ID is missing in the interaction.");
      return;
    }

    // Call use case
    const result = await container.playTrack.execute({
      guildId: interaction.guildId,
      query,
      requestedBy: interaction.user.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: interaction.channelId,
    });

    // Reply
    if (result.playingNow) {
      await interaction.editReply(
        `▶️ Now playing: **${result.track.title}** \`${result.track.formattedDuration}\``,
      );
    } else {
      await interaction.editReply(
        `✅ Added to queue (#${result.queuePosition + 1}): **${result.track.title}**`,
      );
    }
  }
}
