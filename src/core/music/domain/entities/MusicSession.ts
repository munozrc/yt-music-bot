import { AggregateRoot } from "@/core/shared/domain/AggregateRoot";

import {
  QueueEmpty,
  SessionDestroyed,
  TrackEnded,
  TrackStarted,
} from "../events";
import type { GuildId } from "../value-objects/GuildId";
import { Volume } from "../value-objects/Volume";
import { type LoopMode, Queue } from "./Queue";
import type { Track } from "./Track";

export type SessionStatus = "idle" | "playing" | "paused";

export interface MusicSessionProps {
  guildId: GuildId;
  status: SessionStatus;
  voiceChannelId: string;
  textChannelId: string;
  queue: Queue;
  volume: Volume;
}

export class MusicSession extends AggregateRoot<string> {
  private _guildId: GuildId;
  private _voiceChannelId: string;
  private _textChannelId: string;
  private _queue: Queue;
  private _volume: Volume;
  private _status: SessionStatus;

  private constructor(id: string, props: MusicSessionProps) {
    super(id);
    this._guildId = props.guildId;
    this._voiceChannelId = props.voiceChannelId;
    this._textChannelId = props.textChannelId;
    this._queue = props.queue;
    this._volume = props.volume;
    this._status = props.status;
  }

  get guildId(): GuildId {
    return this._guildId;
  }

  get voiceChannelId(): string {
    return this._voiceChannelId;
  }

  get textChannelId(): string {
    return this._textChannelId;
  }

  get queue(): Queue {
    return this._queue;
  }

  get volume(): Volume {
    return this._volume;
  }

  get status(): SessionStatus {
    return this._status;
  }

  get isPlaying(): boolean {
    return this._status === "playing";
  }

  get isPaused(): boolean {
    return this._status === "paused";
  }

  get isIdle(): boolean {
    return this._status === "idle";
  }

  get currentTrack(): Track | null {
    return this._queue.currentTrack;
  }

  /**
   * Adds a track to the queue. If nothing is playing, marks it as the current track.
   * Returns true if playback should start immediately.
   */
  enqueue(track: Track): boolean {
    const shouldStartPlaying = this._queue.isEmpty;
    this._queue.enqueue(track);

    if (shouldStartPlaying) {
      this._status = "playing";
      this.record(new TrackStarted(this._guildId.getValue(), track));
    }

    return shouldStartPlaying;
  }

  /**
   * Skips the current track. Records events and returns the next track (or null).
   */
  skip(): Track | null {
    const current = this._queue.currentTrack;
    if (!current) return null;

    this.record(new TrackEnded(this._guildId.getValue(), current, "skipped"));
    const next = this._queue.advance();

    if (!next) {
      this._status = "idle";
      this.record(
        new QueueEmpty(this._guildId.getValue(), this._voiceChannelId),
      );

      return null;
    }

    this.record(new TrackStarted(this._guildId.getValue(), next));
    return next;
  }

  /**
   * Called when a track finishes naturally (not skipped). Same logic as skip.
   */
  onTrackFinished(): Track | null {
    return this.skip();
  }

  pause(): void {
    if (!this.isPlaying) {
      throw new Error("Cannot pause: session is not playing");
    }

    this._status = "paused";
  }

  resume(): void {
    if (!this.isPaused) {
      throw new Error("Cannot resume: session is not paused");
    }

    this._status = "playing";
  }

  stop(): void {
    const current = this._queue.currentTrack;
    if (current) {
      this.record(new TrackEnded(this._guildId.getValue(), current, "stopped"));
    }

    this._queue.clear();
    this._status = "idle";

    this.record(new QueueEmpty(this._guildId.getValue(), this._voiceChannelId));
  }

  setVolume(volume: Volume): void {
    this._volume = volume;
  }

  setLoopMode(mode: LoopMode): void {
    this._queue.setLoopMode(mode);
  }

  destroy(): void {
    this.stop();
    this.record(
      new SessionDestroyed(
        this._guildId.getValue(),
        this._voiceChannelId,
        "manual",
      ),
    );
  }

  static create(props: {
    guildId: GuildId;
    voiceChannelId: string;
    textChannelId: string;
  }): MusicSession {
    // 1 session per guild → same ID as guild ID
    const id = props.guildId.getValue();
    const queue = Queue.create(`queue-${id}`);

    return new MusicSession(id, {
      guildId: props.guildId,
      voiceChannelId: props.voiceChannelId,
      textChannelId: props.textChannelId,
      queue,
      volume: Volume.default(),
      status: "idle",
    });
  }

  static reconstitute(id: string, props: MusicSessionProps): MusicSession {
    return new MusicSession(id, props);
  }
}
