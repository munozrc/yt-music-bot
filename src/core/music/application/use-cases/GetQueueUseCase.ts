import type { LoopMode } from "../../domain/entities/Queue";
import type { Track } from "../../domain/entities/Track";
import type { MusicSessionRepository } from "../../domain/repositories/MusicSessionRepository";
import { GuildId } from "../../domain/value-objects/GuildId";

export interface GetQueueQuery {
  guildId: string;
}

export interface GetQueueResult {
  currentTrack: Track | null;
  upcoming: Track[];
  totalTracks: number;
  loopMode: LoopMode;
}

export class GetQueueUseCase {
  constructor(private readonly sessionRepo: MusicSessionRepository) {}

  async execute(query: GetQueueQuery): Promise<GetQueueResult> {
    const session = await this.sessionRepo.findByGuildId(
      GuildId.create(query.guildId),
    );

    if (!session) {
      return {
        currentTrack: null,
        upcoming: [],
        totalTracks: 0,
        loopMode: "none",
      };
    }

    return {
      currentTrack: session.currentTrack,
      upcoming: session.queue.upcomingTracks,
      totalTracks: session.queue.size,
      loopMode: session.queue.loopMode,
    };
  }
}
