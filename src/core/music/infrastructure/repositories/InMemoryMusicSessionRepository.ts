import type { MusicSession } from "../../domain/entities/MusicSession";
import type { MusicSessionRepository } from "../../domain/repositories/MusicSessionRepository";
import type { GuildId } from "../../domain/value-objects/GuildId";

export class InMemoryMusicSessionRepository implements MusicSessionRepository {
  private sessions = new Map<string, MusicSession>();

  findByGuildId(guildId: GuildId): Promise<MusicSession | null> {
    const session = this.sessions.get(guildId.getValue()) || null;
    return Promise.resolve(session);
  }

  save(session: MusicSession): Promise<void> {
    this.sessions.set(session.guildId.getValue(), session);
    return Promise.resolve();
  }

  delete(guildId: GuildId): Promise<void> {
    this.sessions.delete(guildId.getValue());
    return Promise.resolve();
  }

  findAll(): Promise<MusicSession[]> {
    return Promise.resolve(Array.from(this.sessions.values()));
  }
}
