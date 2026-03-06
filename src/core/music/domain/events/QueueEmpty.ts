import { DomainEvent } from "@/core/shared/domain/DomainEvent";

/**
 * Fired when the queue runs out of tracks.
 * Consumers: auto-disconnect timer, "queue finished" embed, autoplay, etc.
 */
export class QueueEmpty extends DomainEvent {
  static readonly EVENT_NAME = "music.queue.empty";

  constructor(
    public readonly guildId: string,
    public readonly voiceChannelId: string,
  ) {
    super(QueueEmpty.EVENT_NAME);
  }
}
