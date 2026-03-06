import type { DomainEvent } from "../domain/DomainEvent";

type EventHandler<T extends DomainEvent> = (event: T) => Promise<void> | void;

/**
 * In-process synchronous EventBus.
 * Decouples domain event producers (aggregates) from consumers (handlers).
 *
 * Usage:
 *   eventBus.subscribe(TrackStarted.EVENT_NAME, handler)
 *   eventBus.publish(session.pullDomainEvents())
 */
export class EventBus {
  private handlers = new Map<string, EventHandler<DomainEvent>[]>();

  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ): void {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [
      ...existing,
      handler as EventHandler<DomainEvent>,
    ]);
  }

  unsubscribe<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ): void {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(
      eventName,
      existing.filter((h) => h !== handler),
    );
  }

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.eventName) ?? [];
      await Promise.all(handlers.map((h) => h(event)));
    }
  }
}
