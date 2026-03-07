import { Client, GatewayIntentBits } from "discord.js";

import { GetQueueUseCase } from "@/core/music/application/use-cases/GetQueueUseCase";
import { LeaveUseCase } from "@/core/music/application/use-cases/LeaveUseCase";
import { PlayTrackUseCase } from "@/core/music/application/use-cases/PlayTrackUseCase";
import { ResumeUseCase } from "@/core/music/application/use-cases/ResumeUseCase";
import { SetLoopUseCase } from "@/core/music/application/use-cases/SetLoopUseCase";
import { SetVolumeUseCase } from "@/core/music/application/use-cases/SetVolumeUseCase";
import { SkipTrackUseCase } from "@/core/music/application/use-cases/SkipTrackUseCase";
import { StopUseCase } from "@/core/music/application/use-cases/StopUseCase";
import { AudioPlayerAdapter } from "@/core/music/infrastructure/audio/AudioPlayerAdapter";
import { YoutubeAudioProvider } from "@/core/music/infrastructure/audio/YoutubeAudioProvider";
import { DiscordVoiceAdapter } from "@/core/music/infrastructure/discord/DiscordVoiceAdapter";
import { InMemoryMusicSessionRepository } from "@/core/music/infrastructure/repositories/InMemoryMusicSessionRepository";
import { EventBus } from "@/core/shared/infrastructure/EventBus";

export interface Container {
  // Discord client
  client: Client;

  // Use cases (consumed by bot/commands/)
  getQueue: GetQueueUseCase;
  leave: LeaveUseCase;
  pause: ResumeUseCase;
  playTrack: PlayTrackUseCase;
  resume: ResumeUseCase;
  setLoop: SetLoopUseCase;
  setVolume: SetVolumeUseCase;
  skipTrack: SkipTrackUseCase;
  stop: StopUseCase;
}

export async function buildContainer(): Promise<Container> {
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
  const audioProvider = await YoutubeAudioProvider.create();

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
    getQueue: new GetQueueUseCase(sessionRepo),
    setVolume: new SetVolumeUseCase(sessionRepo, audioPlayer),
    setLoop: new SetLoopUseCase(sessionRepo),
    stop: new StopUseCase(sessionRepo, audioPlayer, eventBus),
    resume: new ResumeUseCase(sessionRepo, audioPlayer),
    pause: new ResumeUseCase(sessionRepo, audioPlayer),

    skipTrack: new SkipTrackUseCase(
      sessionRepo,
      audioPlayer,
      voiceAdapter,
      eventBus,
    ),
  };
}
