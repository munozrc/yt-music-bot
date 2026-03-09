import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Container } from "@/config/container";
import type { LoopMode } from "@/core/music/domain/entities/Queue";
import type { Track } from "@/core/music/domain/entities/Track";

import type { SlashCommand } from "../handlers/SlashCommand";

const LOOP_ICONS: Record<LoopMode, string> = {
  none: "",
  track: " 🔂",
  queue: " 🔁",
  autoplay: " 🔁",
};

const PAGE_SIZE = 10;

export class QueueCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current queue")
    .addIntegerOption((opt) =>
      opt
        .setName("page")
        .setDescription("Page number (default: 1)")
        .setMinValue(1)
        .setRequired(false),
    );

  async execute(
    interaction: ChatInputCommandInteraction,
    container: Container,
  ): Promise<void> {
    const result = await container.getQueue.execute({
      guildId: interaction.guildId as string,
    });

    if (!result.currentTrack && result.upcoming.length === 0) {
      await interaction.reply({
        content: "📭 The queue is empty.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const page = (interaction.options.getInteger("page") ?? 1) - 1;
    const totalPages = Math.ceil(result.upcoming.length / PAGE_SIZE) || 1;
    const clampedPage = Math.min(page, totalPages - 1);

    const embed = this.buildEmbed(result, clampedPage, totalPages);

    await interaction.reply({ embeds: [embed] });
  }

  private buildEmbed(
    result: {
      currentTrack: Track | null;
      upcoming: Track[];
      totalTracks: number;
      loopMode: LoopMode;
    },
    page: number,
    totalPages: number,
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Queue${LOOP_ICONS[result.loopMode]}`);

    if (result.currentTrack) {
      embed.addFields({
        name: "▶️  Now Playing",
        value: `[${result.currentTrack.title}](${result.currentTrack.url}) \`${result.currentTrack.formattedDuration}\``,
      });
    }

    if (result.upcoming.length > 0) {
      const slice = result.upcoming.slice(
        page * PAGE_SIZE,
        page * PAGE_SIZE + PAGE_SIZE,
      );

      const lines = slice.map((track, i) => {
        const position = page * PAGE_SIZE + i + 1;
        return `\`${position}.\` [${track.title}](${track.url}) \`${track.formattedDuration}\``;
      });

      embed.addFields({
        name: `📋  Up Next — ${result.upcoming.length} track${result.upcoming.length !== 1 ? "s" : ""}`,
        value: lines.join("\n"),
      });
    }

    embed.setFooter({
      text: `Page ${page + 1}/${totalPages} · ${result.totalTracks} track${result.totalTracks !== 1 ? "s" : ""} total`,
    });

    return embed;
  }
}
