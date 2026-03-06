import { DomainEvent } from "@/core/shared/domain/DomainEvent";

/**
 * Fired when a guild session is fully destroyed (bot left voice channel).
 * Consumers: resource cleanup, voice connection teardown, session repo delete, etc.
 */
export class SessionDestroyed extends DomainEvent {
  static readonly EVENT_NAME = "music.session.destroyed";

  constructor(
    public readonly guildId: string,
    public readonly voiceChannelId: string,
    /** Why the session ended */
    public readonly reason: "manual" | "inactivity" | "kicked" | "error",
  ) {
    super(SessionDestroyed.EVENT_NAME);
  }
}
