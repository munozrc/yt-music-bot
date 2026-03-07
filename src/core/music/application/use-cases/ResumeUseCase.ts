import type { MusicSessionRepository } from "../../domain/repositories/MusicSessionRepository";
import { GuildId } from "../../domain/value-objects/GuildId";
import type { AudioPlayerAdapter } from "../../infrastructure/audio/AudioPlayerAdapter";

export interface ResumeCommand {
  guildId: string;
}

export class ResumeUseCase {
  constructor(
    private readonly sessionRepo: MusicSessionRepository,
    private readonly audioPlayer: AudioPlayerAdapter,
  ) {}

  async execute(cmd: ResumeCommand): Promise<void> {
    const session = await this.sessionRepo.findByGuildId(
      GuildId.create(cmd.guildId),
    );

    if (!session) throw new Error("No active session in this server");
    if (!session.isPaused) throw new Error("Playback is not paused");

    session.resume(); // domain state
    this.audioPlayer.resume(); // infrastructure
    await this.sessionRepo.save(session);
  }
}
