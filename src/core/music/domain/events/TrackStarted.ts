import { DomainEvent } from "@/core/shared/domain/DomainEvent";

import type { Track } from "../entities/Track";

/**
 * Fired when a track begins playing in a guild session.
 * Consumers: embed updater, activity logger, Last.fm scrobbler, etc.
 */
export class TrackStarted extends DomainEvent {
  static readonly EVENT_NAME = "music.track.started";

  constructor(
    public readonly guildId: string,
    public readonly track: Track,
  ) {
    super(TrackStarted.EVENT_NAME);
  }
}
