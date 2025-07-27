import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  VoiceConnection,
} from "@discordjs/voice";

import type { PlayerMode } from "../types/player.types";
import { logger } from "../utils/logger";
import { YouTubeProvider } from "./providers/YouTubeProvider";
import { Queue } from "./Queue";
import { Track, TrackData } from "./Track";

export class Player {
  public readonly queue = new Queue();
  private readonly audioPlayer: AudioPlayer;
  private voiceConnection: VoiceConnection | null = null;
  private currentResource: AudioResource | null = null;
  private mode: PlayerMode = "normal";
  private volume: number = 0.05;

  constructor() {
    this.audioPlayer = createAudioPlayer();
    this.setupAudioPlayerEvents();
  }

  private setupAudioPlayerEvents(): void {
    this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
      logger.info("AudioPlayer is idle, checking for next track...");

      this.queue.advance();
      let nextTrack = this.queue.current;

      if (!nextTrack && this.mode === "autoplay") {
        logger.info(
          "Queue empty. Autoplay mode enabled, fetching recommendations...",
        );

        await this.appendRecommendations();
        nextTrack = this.queue.current;
      }

      if (!nextTrack) {
        logger.info("Queue finished. No more tracks to play.");
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

  public joinVoiceChannel(connection: VoiceConnection): void {
    if (this.voiceConnection) {
      logger.warn("Already connected to a voice channel.");
      this.disconnect();
    }

    this.voiceConnection = connection;
    this.voiceConnection.subscribe(this.audioPlayer);
    logger.info("Joined voice channel and subscribed to AudioPlayer.");
  }

  public async play(
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

      const filePath = await YouTubeProvider.downloadAndCache(track.url);
      const resource = createAudioResource(filePath, { inlineVolume: true });

      resource.volume?.setVolume(this.volume);
      this.currentResource = resource;
      this.audioPlayer.play(resource);

      logger.info(`[PLAYING] Now playing: ${track.title}`);
    } catch (error) {
      logger.error(`Failed to play track: ${track.title}`, error);
      throw new Error(`Failed to play track: ${track.title}`);
    }
  }

  private async appendRecommendations(): Promise<void> {
    const lastTrack = this.queue.last;
    if (!lastTrack) {
      logger.warn("[Autoplay] No last track found in queue.");
      return;
    }

    try {
      logger.info(
        `[Autoplay] Fetching recommendations based on: "${lastTrack.title}" (${lastTrack.url})`,
      );

      const recommendations = await YouTubeProvider.getRecommendations(
        this.queue.last?.url,
        { limit: 10 },
      );

      if (!recommendations.length) {
        logger.warn(
          `[Autoplay] No recommendations found for: "${lastTrack.title}"`,
        );
        return;
      }

      this.queue.addMany(recommendations);
      logger.info(
        `[Autoplay] Added ${recommendations.length} recommended track(s) to the queue.`,
      );
    } catch (error) {
      logger.error(
        `[Autoplay] Failed to fetch or add recommendations for: "${lastTrack.title}"`,
        error,
      );
      throw new Error(
        `Autoplay failed: Could not fetch recommendations for "${lastTrack.title}".`,
      );
    }
  }

  public skip(): boolean {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
      logger.warn("Cannot skip. No track is currently playing.");
      return false;
    }

    logger.info("Skipping current track...");
    this.audioPlayer.stop(true);

    return this.queue.current !== null;
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

  public disconnect(): void {
    if (!this.voiceConnection) {
      logger.warn("No active voice connection to disconnect.");
      return;
    }

    logger.info("🔌 Disconnecting from voice channel and resetting player...");

    try {
      if (this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
        this.audioPlayer.stop(true);
        logger.debug("AudioPlayer stopped.");
      }

      this.currentResource = null;
      this.queue.clear();
      logger.debug("Queue cleared.");

      this.voiceConnection.destroy();
      this.voiceConnection = null;

      logger.info("✅ Successfully disconnected and reset.");
    } catch (err) {
      logger.error("❌ Error during disconnect:", err);
    }
  }

  public setMode(mode: PlayerMode): void {
    this.mode = mode;
    logger.info(`🔄 Playback mode updated: ${mode}`);
  }
}
