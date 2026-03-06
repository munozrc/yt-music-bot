import type { MusicSession } from "../entities/MusicSession";
import type { GuildId } from "../value-objects/GuildId";

/**
 * Port (interface) of the session repository.
 * The concrete implementation lives in infrastructure/.
 */
export interface MusicSessionRepository {
  /**
   * Finds an active session by guild. Returns null if none exists.
   */
  findByGuildId(guildId: GuildId): Promise<MusicSession | null>;

  /**
   * Persists (create or update) a session.
   */
  save(session: MusicSession): Promise<void>;

  /**
   * Removes the session for a guild.
   */
  delete(guildId: GuildId): Promise<void>;

  /**
   * Returns all active sessions (useful for bot restarts / health checks).
   */
  findAll(): Promise<MusicSession[]>;
}
