import type { EventBus } from "@/core/shared/infrastructure/EventBus";

import type { MusicSessionRepository } from "../../domain/repositories/MusicSessionRepository";
import { GuildId } from "../../domain/value-objects/GuildId";
import type { AudioPlayerAdapter } from "../../infrastructure/audio/AudioPlayerAdapter";
import type { DiscordVoiceAdapter } from "../../infrastructure/discord/DiscordVoiceAdapter";

export interface LeaveCommand {
  guildId: string;
  reason?: "manual" | "inactivity" | "kicked" | "error";
}

/**
 * LeaveUseCase — fully destroys the session and disconnects from voice.
 * Called by /leave command, inactivity timer, or error handlers.
 */
export class LeaveUseCase {
  constructor(
    private readonly sessionRepo: MusicSessionRepository,
    private readonly audioPlayer: AudioPlayerAdapter,
    private readonly voiceAdapter: DiscordVoiceAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: LeaveCommand): Promise<void> {
    const guildId = GuildId.create(cmd.guildId);
    const session = await this.sessionRepo.findByGuildId(guildId);

    // Graceful: if no session exists, just disconnect if somehow connected
    if (!session) {
      this.voiceAdapter.disconnect(guildId.getValue());
      return;
    }

    // Domain: stop + emit SessionDestroyed
    session.destroy();
    this.audioPlayer.stop();
    this.voiceAdapter.disconnect(guildId.getValue());

    await this.sessionRepo.delete(guildId);
    await this.eventBus.publish(session.pullDomainEvents());
  }
}
