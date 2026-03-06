import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

import type { Container } from "@/config/container";

/**
 * Contract every slash command must implement.
 * Commands receive the Container so they can call any use case.
 */
export interface SlashCommand {
  /** Slash command definition sent to Discord API */
  data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    | SlashCommandOptionsOnlyBuilder;

  /** Called when a user invokes the command */
  execute(
    interaction: ChatInputCommandInteraction,
    container: Container,
  ): Promise<void>;
}
