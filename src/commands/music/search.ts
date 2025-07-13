import { getVoiceConnections } from "@discordjs/voice";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { YouTubeProvider } from "../../player/providers/YouTubeProvider";
import { SlashCommand } from "../../types/command.types";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("search")
  .setDescription("Search songs")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("Search songs from YouTube")
      .setRequired(true),
  );

export async function execute(
  interaction: Parameters<SlashCommand["execute"]>[0],
  client: Parameters<SlashCommand["execute"]>[1],
): Promise<void> {
  if (!interaction.isChatInputCommand()) {
    logger.info(`Register interaction ${interaction.commandName}`);
    return;
  }

  try {
    const numberOfConnections = getVoiceConnections().size;
    if (numberOfConnections === 0) {
      logger.error("Bot without voice channel");
      await interaction.reply("You must invite the bot to a voice channel");
      return;
    }

    const query = interaction.options.getString("query");
    if (!query?.length) {
      logger.warn("Query song is not valid");
      await interaction.reply("query song is not valid");
      return;
    }

    const songs = await YouTubeProvider.searchSong(query);
    if (!songs.length) {
      await interaction.reply("😔 No results!");
      return;
    }

    const optionButtons = new Array(songs.length).fill(0).map((_, index) =>
      new ButtonBuilder()
        .setCustomId(`${index + 1}`)
        .setLabel(`${index + 1}`)
        .setStyle(ButtonStyle.Secondary),
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...optionButtons,
    );

    const message = await interaction.reply({
      content: songs.map((s, i) => `\`${i + 1}.\` ${s.toString()}`).join("\n"),
      components: [row],
    });

    let confirmation;
    try {
      confirmation = await message.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60_000,
      });
    } catch (error) {
      logger.error("Time expired! No song selected.", error);
      await interaction.editReply({
        content: "⏰ Time expired! No song selected.",
        components: [],
      });
      return;
    }

    const songSelected = songs[parseInt(confirmation.customId) - 1];
    if (typeof songSelected === "undefined") {
      await confirmation.update({ content: "I couldn't add the song" });
      return;
    }

    const requestedBy = interaction.user.username ?? "unknown";
    await client.player.play(songSelected, requestedBy);

    const containerResponse = new ContainerBuilder()
      .setAccentColor(0x0099ff)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `🎶 Song **[${songSelected.artist} - ${songSelected.title}](https://www.youtube.com/watch?v=${songSelected.url})** add to the queue! \`${songSelected.formattedDuration}\``,
        ),
      );

    await confirmation.update({
      components: [containerResponse],
      flags: MessageFlags.IsComponentsV2,
      content: "",
    });
  } catch (error) {
    logger.error("Failed to execute /search command", error);

    const errorMessage = "❌ Something went wrong while searching.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
