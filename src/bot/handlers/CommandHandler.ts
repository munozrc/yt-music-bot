import {
  ChatInputCommandInteraction,
  Collection,
  MessageFlags,
} from "discord.js";

import type { Container } from "@/config/container";

import type { SlashCommand } from "./SlashCommand";

/**
 * CommandHandler
 *
 * Holds a registry of all slash commands and routes incoming
 * interactions to the right one, injecting the Container.
 */
export class CommandHandler {
  private readonly commands = new Collection<string, SlashCommand>();

  constructor(private readonly container: Container) {}

  register(...commands: SlashCommand[]): void {
    for (const command of commands) {
      this.commands.set(command.data.name, command);
    }
  }

  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName);

    if (!command) {
      await interaction.reply({
        content: "❌ Unknown command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await command.execute(interaction, this.container);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`❌ ${message}`);
      } else {
        await interaction.reply({
          content: `❌ ${message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

  /** Returns command definitions for Discord API registration */
  toJSON() {
    return this.commands.map((cmd) => cmd.data.toJSON());
  }
}
