import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";

import { handleInteractionCreate } from "./events/interaction.event";
import { handleIsReady } from "./events/ready.event";
import { Player } from "./player/Player";
import { YouTubeProvider } from "./player/providers/YouTubeProvider";
import { SlashCommand } from "./types/command.types";
import { config } from "./utils/config";
import { logger } from "./utils/logger";

export class ApplicationClient {
  public client: Client;
  public commands: Collection<string, SlashCommand>;

  public player: Player;
  public rest: REST;

  constructor() {
    this.client = this.createClient();
    this.rest = new REST().setToken(config.DISCORD_TOKEN);
    this.commands = new Collection();
    this.player = new Player();
  }

  public async start(): Promise<void> {
    logger.info("🟢 Starting bot initialization...");

    try {
      await this.loadCommands();
      await this.deployCommands();
      this.registerEventListeners();

      logger.info("🎵 Initializing audio providers...");
      await YouTubeProvider.init();
      logger.success("✅ Audio providers initialized.");

      logger.info("🔑 Logging in to Discord...");
      await this.client.login(config.DISCORD_TOKEN);
    } catch (error) {
      logger.error("❌ Bot initialization failed:", error);
      throw error;
    }
  }

  private createClient(): Client<boolean> {
    return new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });
  }

  private async registerEventListeners(): Promise<void> {
    logger.info("🔗 Registering event listeners...");

    this.client.once(Events.ClientReady, handleIsReady);
    this.client.on(Events.InteractionCreate, (...args) =>
      handleInteractionCreate(this, ...args),
    );
  }

  private async loadCommands(): Promise<void> {
    const commandsPath = path.join(__dirname, "commands");
    const categories = fs.readdirSync(commandsPath);

    logger.info("📦 Registering commands...");

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
        logger.debug(`✅ Loaded command: ${data.name}`);
      }
    }

    logger.info(`📦 Total commands loaded: ${this.commands.size}`);
  }

  private async deployCommands(): Promise<void> {
    try {
      logger.info("🚀 Deploying slash commands...");
      logger.info("Started refreshing application (/) commands.");

      const commandsData = this.commands.map((cmd) => cmd.data.toJSON());
      logger.info(`Registering ${commandsData.length} slash commands...`);

      await this.rest.put(
        process.env.DEBUG === "true"
          ? Routes.applicationCommands(config.CLIENT_ID)
          : Routes.applicationGuildCommands(config.CLIENT_ID, config.SERVER_ID),
        { body: commandsData },
      );

      logger.success("✅ Successfully reloaded application (/) commands.");
    } catch (error) {
      logger.error("❌ Failed to register slash commands:", error);
      throw new Error("Failed to deploy application commands.");
    }
  }
}
