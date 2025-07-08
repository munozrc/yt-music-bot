import { Client, Collection, GatewayIntentBits } from "discord.js";

import { handleIsReady } from "./events/ready.event";
import { config } from "./utils/config";
import { logger } from "./utils/logger";

export class ApplicationClient {
  public client: Client;
  public commands: Collection<string, unknown>;

  constructor() {
    this.client = this.createClient();
    this.commands = new Collection();

    this.loadEvents();
    this.loadCommands();
  }

  createClient(): Client<boolean> {
    return new Client({
      intents: [GatewayIntentBits.Guilds],
    });
  }

  start(): Promise<string> {
    return this.client.login(config.DISCORD_TOKEN);
  }

  async loadEvents(): Promise<void> {
    this.client.once("ready", handleIsReady);
  }

  async loadCommands(): Promise<void> {
    logger.info(`🎵 Loaded command: greeting`);
  }
}
