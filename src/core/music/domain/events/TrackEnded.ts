import { DomainEvent } from "@/core/shared/domain/DomainEvent";

import type { Track } from "../entities/Track";

/**
 * Fired when a track finishes playing (naturally or via skip/stop).
 * Consumers: play history, statistics, recommendations engine, etc.
 */
export class TrackEnded extends DomainEvent {
  static readonly EVENT_NAME = 'music.track.ended';

  constructor(
    public readonly guildId: string,
    public readonly track: Track,
    /** Whether the track was skipped manually or ended naturally */
    public readonly reason: 'finished' | 'skipped' | 'stopped',
  ) {
    super(TrackEnded.EVENT_NAME);
  }
}