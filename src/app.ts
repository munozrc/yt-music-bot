import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";

import { handleInteractionCreate } from "./events/interaction.event";
import { handleIsReady } from "./events/ready.event";
import { YouTubeProvider } from "./player/providers/YouTubeProvider";
import { SlashCommand } from "./types/command.types";
import { config } from "./utils/config";
import { logger } from "./utils/logger";

export class ApplicationClient {
  public client: Client;
  public commands: Collection<string, SlashCommand>;
  public rest: REST;

  constructor() {
    this.client = this.createClient();
    this.commands = new Collection();
    this.rest = new REST().setToken(config.DISCORD_TOKEN);

    this.loadEvents();
  }

  createClient(): Client<boolean> {
    return new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });
  }

  async start(): Promise<void> {
    await this.loadCommands();
    await this.deployCommands();
    await YouTubeProvider.init();
    await this.client.login(config.DISCORD_TOKEN);
  }

  async loadEvents(): Promise<void> {
    this.client.once("ready", handleIsReady);
    this.client.on("interactionCreate", (...args) =>
      handleInteractionCreate(this, ...args),
    );
  }

  async loadCommands(): Promise<void> {
    const commandsPath = path.join(__dirname, "commands");
    const categories = fs.readdirSync(commandsPath);

    for (const dirent of categories) {
      const categoryPath = path.join(commandsPath, dirent);
      const commandFiles = fs
        .readdirSync(categoryPath)
        .filter((file) => file.endsWith(".ts"));

      for (const file of commandFiles) {
        const filePath = path.join(categoryPath, file);
        const commandModule = pathToFileURL(filePath).href;
        const { data, execute } = await import(commandModule);

        this.commands.set(data.name, { data, execute });
        logger.success(`✅ Loaded command: ${data.name}`);
      }
    }
  }

  async deployCommands(): Promise<void> {
    try {
      logger.info("Started refreshing application (/) commands.");
      const commandsData = this.commands.map((cmd) => cmd.data.toJSON());

      await this.rest.put(
        Routes.applicationGuildCommands(config.CLIENT_ID, config.SERVER_ID),
        { body: commandsData },
      );

      logger.success("Successfully reloaded application (/) commands.");
    } catch (error) {
      logger.error("Failed to register slash commands:", error);
      throw new Error("Failed to deploy application commands.");
    }
  }
}
