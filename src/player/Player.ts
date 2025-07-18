import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  VoiceConnection,
} from "@discordjs/voice";

import { logger } from "../utils/logger";
import { YouTubeProvider } from "./providers/YouTubeProvider";
import { Queue } from "./Queue";
import { Track, TrackData } from "./Track";

export class Player {
  public readonly queue = new Queue();
  private readonly audioPlayer: AudioPlayer;
  private voiceConnection: VoiceConnection | null = null;
  private currentResource: AudioResource | null = null;
  private volume: number = 0.1;

  constructor() {
    this.audioPlayer = createAudioPlayer();
    this.setupAudioPlayerEvents();
  }

  private setupAudioPlayerEvents(): void {
    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      logger.info("AudioPlayer is idle, checking for next track...");

      this.queue.advance();
      const nextTrack = this.queue.current;

      if (!nextTrack) {
        logger.info("Queue finished. Disconnecting...");
        return;
      }

      this.playTrack(nextTrack).catch((err) => {
        logger.error(`Error playing next track: ${nextTrack.title}`, err);
        logger.info(`Skipping problematic track: ${nextTrack.title}`);

        this.queue.advance();
        this.audioPlayer.emit(AudioPlayerStatus.Idle);
      });
    });

    this.audioPlayer.on("error", (error) => {
      logger.error("AudioPlayer encountered an error:", error);
      this.skip();
    });

    this.audioPlayer.on("stateChange", (oldState, newState) => {
      if (oldState.status !== newState.status) {
        logger.debug(
          `AudioPlayer state changed: ${oldState.status} → ${newState.status}`,
        );
      }
    });
  }

  joinVoiceChannel(connection: VoiceConnection): void {
    if (this.voiceConnection) {
      logger.warn("Already connected to a voice channel.");
      this.disconnect();
    }

    this.voiceConnection = connection;
    this.voiceConnection.subscribe(this.audioPlayer);
    logger.info("Joined voice channel and subscribed to AudioPlayer.");
  }

  async play(
    song: Omit<TrackData, "requestedBy">,
    requestedBy: string,
  ): Promise<void> {
    try {
      const track = new Track({ ...song, requestedBy });
      this.queue.add(track);

      if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
        await this.playTrack(track);
      }
    } catch (error) {
      logger.error(`Failed to play song: ${song.title}`);
      throw error;
    }
  }

  private async playTrack(track: Track): Promise<void> {
    try {
      logger.info(`[PLAYING] Preparing to play: ${track.title}`);

      const stream = await YouTubeProvider.downloadAndCache(track.url);
      const resource = createAudioResource(stream, { inlineVolume: true });

      resource.volume?.setVolume(this.volume);
      this.currentResource = resource;
      this.audioPlayer.play(resource);

      logger.info(`[PLAYING] Now playing: ${track.title}`);
    } catch (error) {
      logger.error(`Failed to play track: ${track.title}`, error);
      throw new Error(`Failed to play track: ${track.title}`);
    }
  }

  skip(): boolean {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
      logger.warn("Cannot skip. No track is currently playing.");
      return false;
    }

    logger.info("Skipping current track...");
    this.audioPlayer.stop(true);

    return this.queue.current !== null;
  }

  pause(): void {
    if (this.audioPlayer.pause()) {
      logger.info("Playback paused.");
    } else {
      logger.warn("Failed to pause. Is there a track playing?");
    }
  }

  resume(): void {
    if (this.audioPlayer.unpause()) {
      logger.info("Playback resumed.");
    } else {
      logger.warn("Failed to resume. Was playback paused?");
    }
  }

  public setVolume(volume: number): void {
    if (volume < 0 || volume > 1) {
      logger.warn("⚠️ Volume must be between 0.0 and 1.0");
      return;
    }

    this.volume = volume;
    this.currentResource?.volume?.setVolume(volume);

    logger.info(`🔊 Volume changed to ${Math.round(volume * 100)}%`);
  }

  disconnect(): void {
    if (!this.voiceConnection) {
      logger.warn("No active voice connection to disconnect.");
      return;
    }

    logger.info("Disconnecting from voice channel...");
    this.voiceConnection.destroy();
    this.voiceConnection = null;
  }
}
