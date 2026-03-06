import {
  type AudioPlayer,
  AudioPlayerStatus,
  type AudioResource,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnection,
} from "@discordjs/voice";

import type { Track } from "../../domain/entities/Track";
import type { AudioProvider } from "../../domain/repositories/AudioProvider";
import { Volume } from "../../domain/value-objects/Volume";

export interface PlayerEventMap {
  trackStart: (track: Track) => void;
  trackEnd: (track: Track) => void;
  trackError: (track: Track, error: Error) => void;
  idle: () => void;
}

/**
 * AudioPlayerAdapter
 *
 * Wraps @discordjs/voice AudioPlayer for a single guild session.
 * One instance per active MusicSession.
 *
 * Responsibilities:
 *  - Create and manage the Discord AudioPlayer lifecycle
 *  - Stream audio via the injected AudioProvider
 *  - Expose typed callbacks for domain events (trackStart, trackEnd, etc.)
 *  - Apply volume changes in real time
 */
export class AudioPlayerAdapter {
  private readonly player: AudioPlayer;
  private currentResource: AudioResource | null = null;
  private currentTrack: Track | null = null;
  private callbacks: Partial<PlayerEventMap> = {};

  constructor(private readonly audioProvider: AudioProvider) {
    this.player = createAudioPlayer();
    this.registerPlayerListeners();
  }

  on<K extends keyof PlayerEventMap>(event: K, cb: PlayerEventMap[K]): this {
    this.callbacks[event] = cb;
    return this;
  }

  async play(track: Track, connection: VoiceConnection): Promise<void> {
    const { resource: stream } = await this.audioProvider.stream(track);

    this.currentResource = createAudioResource(stream, {
      inlineVolume: true,
    });

    this.currentTrack = track;
    connection.subscribe(this.player);
    this.player.play(this.currentResource);

    await entersState(this.player, AudioPlayerStatus.Playing, 5_000);
  }

  pause(): void {
    this.player.pause();
  }

  resume(): void {
    this.player.unpause();
  }

  stop(): void {
    this.player.stop(true);
    this.currentTrack = null;
    this.currentResource = null;
  }

  setVolume(volume: Volume): void {
    this.currentResource?.volume?.setVolume(volume.normalized);
  }

  get isPlaying(): boolean {
    return this.player.state.status === AudioPlayerStatus.Playing;
  }

  get isPaused(): boolean {
    return this.player.state.status === AudioPlayerStatus.Paused;
  }

  private registerPlayerListeners(): void {
    this.player.on(AudioPlayerStatus.Idle, () => {
      const ended = this.currentTrack;

      this.currentTrack = null;
      this.currentResource = null;

      if (ended) this.callbacks.trackEnd?.(ended);
      this.callbacks.idle?.();
    });

    this.player.on("error", (error) => {
      const failed = this.currentTrack;
      if (failed) this.callbacks.trackError?.(failed, error);
    });
  }
}
