import type { CommandInteraction, SlashCommandBuilder } from "discord.js";

import { ApplicationClient } from "../app";

export type SlashCommand = {
  data: SlashCommandBuilder;
  execute: (
    interaction: CommandInteraction,
    client: ApplicationClient,
  ) => Promise<void>;
};
