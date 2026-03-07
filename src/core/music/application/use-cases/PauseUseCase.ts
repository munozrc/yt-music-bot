import type { MusicSessionRepository } from "../../domain/repositories/MusicSessionRepository";
import { GuildId } from "../../domain/value-objects/GuildId";
import type { AudioPlayerAdapter } from "../../infrastructure/audio/AudioPlayerAdapter";

export interface PauseCommand {
  guildId: string;
}

export class PauseUseCase {
  constructor(
    private readonly sessionRepo: MusicSessionRepository,
    private readonly audioPlayer: AudioPlayerAdapter,
  ) {}

  async execute(cmd: PauseCommand): Promise<void> {
    const session = await this.sessionRepo.findByGuildId(
      GuildId.create(cmd.guildId),
    );

    if (!session) {
      throw new Error("No active session in this server");
    }

    if (!session.isPlaying) {
      throw new Error("Nothing is playing right now");
    }

    session.pause(); // domain state
    this.audioPlayer.pause(); // infrastructure

    // Persist session changes (isPaused = true)
    await this.sessionRepo.save(session);
  }
}
