import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  VoiceConnection,
} from "@discordjs/voice";

import { logger } from "../utils/logger";
import { YouTubeProvider } from "./providers/YouTubeProvider";
import { Queue } from "./Queue";
import { Track, TrackData } from "./Track";

class Player {
  public readonly queue = new Queue();
  private readonly audioPlayer: AudioPlayer;
  private voiceConnection: VoiceConnection | null = null;

  constructor() {
    this.audioPlayer = createAudioPlayer();

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      const nextTrack = this.queue.next;
      if (nextTrack) {
        this.playTrack(nextTrack);
      } else {
        logger.info("Queue ended.");
        this.disconnect();
      }
    });

    this.audioPlayer.on("error", (error) => {
      logger.error("Audio Player Error:", error);
      this.skip();
    });
  }

  joinVoiceChannel(connection: VoiceConnection): void {
    this.voiceConnection = connection;
    this.voiceConnection.subscribe(this.audioPlayer);
  }

  async play(
    song: Omit<TrackData, "requestedBy">,
    requestedBy: string,
  ): Promise<void> {
    const track = new Track({ ...song, requestedBy });
    this.queue.add(track);

    if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
      this.playTrack(track);
    }
  }

  private async playTrack(track: Track): Promise<void> {
    try {
      const stream = await YouTubeProvider.getStream(track.url);
      const resource = createAudioResource(stream);

      this.audioPlayer.play(resource);
      logger.info(`🎶 Now playing: ${track.title}`);
    } catch (error) {
      logger.error(`Failed to play track: ${track.title}`, error);
      throw error;
    }
  }

  skip(): void {
    this.audioPlayer.stop(true);
  }

  pause(): void {
    this.audioPlayer.pause();
  }

  resume(): void {
    this.audioPlayer.unpause();
  }

  disconnect(): void {
    this.voiceConnection?.destroy();
    this.voiceConnection = null;
  }
}

export const player = new Player();
