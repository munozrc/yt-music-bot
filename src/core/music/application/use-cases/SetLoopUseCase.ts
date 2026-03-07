import type { LoopMode } from "../../domain/entities/Queue";
import type { MusicSessionRepository } from "../../domain/repositories/MusicSessionRepository";
import { GuildId } from "../../domain/value-objects/GuildId";

export interface SetLoopCommand {
  guildId: string;
  mode: LoopMode;
}

export class SetLoopUseCase {
  constructor(private readonly sessionRepo: MusicSessionRepository) {}

  async execute(cmd: SetLoopCommand): Promise<void> {
    const session = await this.sessionRepo.findByGuildId(
      GuildId.create(cmd.guildId),
    );

    if (!session) {
      throw new Error("No active session in this server");
    }

    session.setLoopMode(cmd.mode);
    await this.sessionRepo.save(session);
  }
}
