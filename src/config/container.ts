import { Client, GatewayIntentBits } from "discord.js";

import { LeaveUseCase } from "@/core/music/application/use-cases/LeaveUseCase";
import { PlayTrackUseCase } from "@/core/music/application/use-cases/PlayTrackUseCase";
import { AudioPlayerAdapter } from "@/core/music/infrastructure/audio/AudioPlayerAdapter";
import { YoutubeAudioProvider } from "@/core/music/infrastructure/audio/YoutubeAudioProvider";
import { DiscordVoiceAdapter } from "@/core/music/infrastructure/discord/DiscordVoiceAdapter";
import { InMemoryMusicSessionRepository } from "@/core/music/infrastructure/repositories/InMemoryMusicSessionRepository";
import { EventBus } from "@/core/shared/infrastructure/EventBus";

export interface Container {
  // Discord client
  client: Client;

  // Use cases (consumed by bot/commands/)
  playTrack: PlayTrackUseCase;
  leave: LeaveUseCase;
}

export function buildContainer(): Container {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
    ],
  });

  // Shared infrastructure
  const eventBus = new EventBus();

  // Infrastructure adapters
  const sessionRepo = new InMemoryMusicSessionRepository();
  const audioProvider = new YoutubeAudioProvider();

  // Discord adapters
  const audioPlayer = new AudioPlayerAdapter(audioProvider);
  const voiceAdapter = new DiscordVoiceAdapter(client);

  return {
    client,

    // Use cases
    playTrack: new PlayTrackUseCase(
      sessionRepo,
      audioProvider,
      audioPlayer,
      voiceAdapter,
      eventBus,
    ),

    leave: new LeaveUseCase(sessionRepo, audioPlayer, voiceAdapter, eventBus),
  };
}
