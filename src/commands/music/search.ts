import { getVoiceConnections } from "@discordjs/voice";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import { player } from "../../player/Player";
import { YouTubeProvider } from "../../player/providers/YouTubeProvider";
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

export async function execute(interaction: CommandInteraction): Promise<void> {
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

    const songList = songs.map((song, i) => {
      return `\`[${i + 1}]\` **${song.artist}** - ${song.title}`;
    });
    const message = await interaction.reply({
      content: songList.join("\n"),
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
      await confirmation.update({
        content: "I couldn't add the song",
        components: [],
      });
      return;
    }

    const requestedBy = interaction.user.username ?? "unknown";
    await player.play(songSelected, requestedBy);

    const responseEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Added Song!")
      .setImage(songSelected.thumbnail)
      .setDescription(`${songSelected.artist} - ${songSelected.title}`);

    await confirmation.update({
      content: "",
      components: [],
      embeds: [responseEmbed],
    });
  } catch (error) {
    logger.error("Failed to execute /search command", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp("Something went wrong while searching.");
    } else {
      await interaction.reply("Something went wrong while searching.");
    }
  }
}
