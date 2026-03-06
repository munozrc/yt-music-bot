export abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly eventName: string;

  constructor(eventName: string) {
    this.eventName = eventName;
    this.occurredAt = new Date();
  }
}
