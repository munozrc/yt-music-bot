import {
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { Client } from "discord.js";

/**
 * DiscordVoiceAdapter
 *
 * Manages VoiceConnection lifecycle per guild.
 * Receives the discord.js Client in the constructor so it can resolve
 * the adapterCreator internally — keeping it out of the application layer.
 *
 * One instance shared across all guild sessions (stateless per guild,
 * connections are tracked by @discordjs/voice internally via getVoiceConnection).
 */
export class DiscordVoiceAdapter {
  constructor(private readonly client: Client) {}

  async join(guildId: string, channelId: string): Promise<VoiceConnection> {
    // Reuse existing connection if already joined to this guild
    const existing = getVoiceConnection(guildId);
    if (existing) return existing;

    const guild = await this.client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);

    if (!channel?.isVoiceBased()) {
      throw new Error(`Channel ${channelId} is not a voice channel`);
    }

    const connection = joinVoiceChannel({
      guildId,
      channelId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    await this.waitUntilReady(connection);
    this.registerReconnectHandler(connection);

    return connection;
  }

  disconnect(guildId: string): void {
    const connection = getVoiceConnection(guildId);
    connection?.destroy();
  }

  getConnection(guildId: string): VoiceConnection | null {
    return getVoiceConnection(guildId) ?? null;
  }

  isConnected(guildId: string): boolean {
    const conn = getVoiceConnection(guildId);
    return conn?.state.status === VoiceConnectionStatus.Ready;
  }

  private async waitUntilReady(
    connection: VoiceConnection,
    timeoutMs = 10_000,
  ): Promise<void> {
    await entersState(connection, VoiceConnectionStatus.Ready, timeoutMs);
  }

  private registerReconnectHandler(connection: VoiceConnection): void {
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        connection.destroy();
      }
    });
  }
}
