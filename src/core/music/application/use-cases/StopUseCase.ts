import type { EventBus } from "@/core/shared/infrastructure/EventBus";

import type { MusicSessionRepository } from "../../domain/repositories/MusicSessionRepository";
import { GuildId } from "../../domain/value-objects/GuildId";
import type { AudioPlayerAdapter } from "../../infrastructure/audio/AudioPlayerAdapter";

export interface StopCommand {
  guildId: string;
}

/**
 * StopUseCase — clears the queue and stops playback.
 * The bot STAYS in the voice channel (use LeaveUseCase to disconnect).
 */
export class StopUseCase {
  constructor(
    private readonly sessionRepo: MusicSessionRepository,
    private readonly audioPlayer: AudioPlayerAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: StopCommand): Promise<void> {
    const session = await this.sessionRepo.findByGuildId(
      GuildId.create(cmd.guildId),
    );

    if (!session) throw new Error("No active session in this server");

    session.stop(); // domain: clears queue, emits TrackEnded + QueueEmpty
    this.audioPlayer.stop(); // infrastructure
    await this.sessionRepo.save(session);
    await this.eventBus.publish(session.pullDomainEvents());
  }
}
