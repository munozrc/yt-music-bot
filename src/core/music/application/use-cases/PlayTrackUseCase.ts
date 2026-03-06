import type { EventBus } from "@/core/shared/infrastructure/EventBus";

import { MusicSession } from "../../domain/entities/MusicSession";
import type { AudioProvider } from "../../domain/repositories/AudioProvider";
import type { MusicSessionRepository } from "../../domain/repositories/MusicSessionRepository";
import { GuildId } from "../../domain/value-objects/GuildId";
import type { AudioPlayerAdapter } from "../../infrastructure/audio/AudioPlayerAdapter";
import type { DiscordVoiceAdapter } from "../../infrastructure/discord/DiscordVoiceAdapter";

interface PlayTrackCommand {
  guildId: string;
  query: string;
  requestedBy: string;
  voiceChannelId: string;
  textChannelId: string;
}

export class PlayTrackUseCase {
  constructor(
    private readonly sessionRepo: MusicSessionRepository,
    private readonly audioProvider: AudioProvider,
    private readonly audioPlayer: AudioPlayerAdapter,
    private readonly voiceAdapter: DiscordVoiceAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: PlayTrackCommand) {
    const guildId = GuildId.create(cmd.guildId);

    // Join voice / reuse session — no Discord details leak here
    const { session } = await this.joinVoiceChannel({
      guildId,
      voiceChannelId: cmd.voiceChannelId,
      textChannelId: cmd.textChannelId,
    });

    // Resolve query → Track metadata
    const track = await this.audioProvider.resolve(cmd.query, cmd.requestedBy);

    // Enqueue in domain
    const queuePosition = session.queue.size;
    const shouldStartNow = session.enqueue(track);
    await this.sessionRepo.save(session);

    // Start playback if first track
    if (shouldStartNow) {
      const connection = this.voiceAdapter.getConnection(cmd.guildId);
      if (!connection) throw new Error("No voice connection available");

      await this.audioPlayer.play(track, connection);
      this.registerTrackEndHandler(guildId);
    }

    // 5. Publish domain events
    await this.eventBus.publish(session.pullDomainEvents());

    return { track, playingNow: shouldStartNow, queuePosition };
  }

  /**
   * Joins the voice channel for the given command, creating a new music session if needed.
   * Idempotent: if already joined, returns existing session without error.
   */
  private async joinVoiceChannel(params: {
    guildId: GuildId;
    voiceChannelId: string;
    textChannelId: string;
  }): Promise<{ session: MusicSession; created: boolean }> {
    // Reuse existing session (idempotent)
    const existing = await this.sessionRepo.findByGuildId(params.guildId);
    if (existing) return { session: existing, created: false };

    // Connect to voice — adapter handles adapterCreator internally
    await this.voiceAdapter.join(
      params.guildId.getValue(),
      params.voiceChannelId,
    );

    const session = MusicSession.create({
      guildId: params.guildId,
      voiceChannelId: params.voiceChannelId,
      textChannelId: params.textChannelId,
    });

    await this.sessionRepo.save(session);

    return {
      session,
      created: true,
    };
  }

  /**
   * Registers a handler to listen for track end events and advance the queue accordingly.
   * Note: this is a simple implementation that assumes one track at a time and no external interruptions.
   */
  private registerTrackEndHandler(guildId: GuildId): void {
    this.audioPlayer.on("idle", async () => {
      const session = await this.sessionRepo.findByGuildId(guildId);
      if (!session) return;

      const nextTrack = session.onTrackFinished();

      await this.sessionRepo.save(session);
      await this.eventBus.publish(session.pullDomainEvents());

      if (nextTrack) {
        const connection = this.voiceAdapter.getConnection(guildId.getValue());
        if (!connection) return;
        await this.audioPlayer.play(nextTrack, connection);
      }
    });
  }
}
