import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Container } from "@/config/container";
import type { LoopMode } from "@/core/music/domain/entities/Queue";

import type { SlashCommand } from "../handlers/SlashCommand";

const LOOP_LABELS: Record<LoopMode, string> = {
  none: "➡️  Off",
  track: "🔂  Track",
  queue: "🔁  Queue",
};

export class LoopCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Set the loop mode")
    .addStringOption((opt) =>
      opt
        .setName("mode")
        .setDescription("Loop mode")
        .setRequired(true)
        .addChoices(
          { name: "Off", value: "none" },
          { name: "Track", value: "track" },
          { name: "Queue", value: "queue" },
        ),
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

    const mode = interaction.options.getString("mode", true) as LoopMode;

    await container.setLoop.execute({
      guildId: interaction.guildId as string,
      mode,
    });

    await interaction.reply(`Loop mode set to **${LOOP_LABELS[mode]}**`);
  }
}
