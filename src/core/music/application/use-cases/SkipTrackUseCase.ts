import { logger } from "@/config/logger";
import type { EventBus } from "@/core/shared/infrastructure/EventBus";

import type { Track } from "../../domain/entities/Track";
import type { AudioProvider } from "../../domain/repositories/AudioProvider";
import type { MusicSessionRepository } from "../../domain/repositories/MusicSessionRepository";
import { GuildId } from "../../domain/value-objects/GuildId";
import type { AudioPlayerAdapter } from "../../infrastructure/audio/AudioPlayerAdapter";
import type { DiscordVoiceAdapter } from "../../infrastructure/discord/DiscordVoiceAdapter";

export interface SkipTrackCommand {
  guildId: string;
  requestedBy: string;
}

export interface SkipTrackResult {
  skipped: Track;
  next: Track | null;
}

export class SkipTrackUseCase {
  constructor(
    private readonly sessionRepo: MusicSessionRepository,
    private readonly audioProvider: AudioProvider,
    private readonly audioPlayer: AudioPlayerAdapter,
    private readonly voiceAdapter: DiscordVoiceAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: SkipTrackCommand): Promise<SkipTrackResult> {
    const guildId = GuildId.create(cmd.guildId);
    const session = await this.sessionRepo.findByGuildId(guildId);

    if (!session) throw new Error("No active session in this server");
    if (!session.currentTrack) throw new Error("Nothing is playing right now");

    const skipped = session.currentTrack;

    // Autoplay prefetch: if skipping the last track, fetch recommendations before advancing
    if (
      session.queue.loopMode === "autoplay" &&
      session.queue.upcomingTracks.length === 0 &&
      session.currentTrack
    ) {
      try {
        const recs = await this.audioProvider.getRecommendations(
          session.currentTrack,
          5,
        );
        session.queue.enqueueMany(recs);
      } catch {
        logger.warn(
          `[Autoplay] Failed to fetch recommendations on skip for guild ${guildId.getValue()}.`,
        );
      }
    }

    // Domain: advance queue, emits TrackEnded + (TrackStarted | QueueEmpty)
    const next = session.skip();
    await this.sessionRepo.save(session);

    // Stop current audio
    this.audioPlayer.stop();

    // Start next track if any
    if (next) {
      const connection = this.voiceAdapter.getConnection(guildId.getValue());
      if (!connection) throw new Error("No voice connection available");

      await this.audioPlayer.play(next, connection, session.volume);
    }

    // Publish domain events (TrackEnded, TrackStarted/QueueEmpty)
    await this.eventBus.publish(session.pullDomainEvents());

    return {
      skipped,
      next,
    };
  }
}
