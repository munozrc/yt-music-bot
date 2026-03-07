import type { MusicSessionRepository } from "../../domain/repositories/MusicSessionRepository";
import { GuildId } from "../../domain/value-objects/GuildId";
import { Volume } from "../../domain/value-objects/Volume";
import type { AudioPlayerAdapter } from "../../infrastructure/audio/AudioPlayerAdapter";

export interface SetVolumeCommand {
  guildId: string;
  volume: number;
}

export class SetVolumeUseCase {
  constructor(
    private readonly sessionRepo: MusicSessionRepository,
    private readonly audioPlayer: AudioPlayerAdapter,
  ) {}

  async execute(cmd: SetVolumeCommand): Promise<void> {
    const session = await this.sessionRepo.findByGuildId(
      GuildId.create(cmd.guildId),
    );

    if (!session) throw new Error("No active session in this server");

    const volume = Volume.create(cmd.volume);
    session.setVolume(volume); // domain state

    this.audioPlayer.setVolume(volume); // applied to live AudioResource
    await this.sessionRepo.save(session);
  }
}
