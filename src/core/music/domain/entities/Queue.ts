import { Entity } from "@/core/shared/domain/Entity";

import type { Track } from "./Track";

export type LoopMode = "none" | "track" | "queue" | "autoplay";

export class Queue extends Entity<string> {
  private _tracks: Track[];
  private _currentIndex: number;
  private _loopMode: LoopMode;

  private constructor(id: string, tracks: Track[], loopMode: LoopMode) {
    super(id);
    this._tracks = tracks;
    this._currentIndex = 0;
    this._loopMode = loopMode;
  }

  get isEmpty(): boolean {
    return this._tracks.length === 0;
  }

  get size(): number {
    return this._tracks.length;
  }

  get loopMode(): LoopMode {
    return this._loopMode;
  }

  get currentTrack(): Track | null {
    return this._tracks[this._currentIndex] ?? null;
  }

  get upcomingTracks(): Track[] {
    return this._tracks.slice(this._currentIndex + 1);
  }

  get allTracks(): readonly Track[] {
    return [...this._tracks];
  }

  get totalDurationSeconds(): number {
    return this._tracks.reduce((acc, t) => acc + t.durationSeconds, 0);
  }

  enqueue(track: Track): void {
    this._tracks.push(track);
  }

  enqueueMany(tracks: Track[]): void {
    this._tracks.push(...tracks);
  }

  /**
   * Advances the queue. Returns the next track to play, or null if the queue ended.
   * Respects the current LoopMode.
   */
  advance(): Track | null {
    if (this._loopMode === "track") {
      return this.currentTrack; // replay same track
    }

    if (this._loopMode === "queue") {
      this._currentIndex = (this._currentIndex + 1) % this._tracks.length;
      return this.currentTrack;
    }

    // 'none' and 'autoplay' mode — autoplay prefetch is handled in the application layer
    this._tracks.shift(); // remove current
    // _currentIndex stays at 0, pointing to next track
    return this.currentTrack;
  }

  setLoopMode(mode: LoopMode): void {
    this._loopMode = mode;
  }

  remove(index: number): Track | undefined {
    if (index < 0 || index >= this._tracks.length) {
      throw new Error(`Cannot remove track at index ${index}: out of bounds`);
    }
    const [removed] = this._tracks.splice(index, 1);
    return removed;
  }

  clear(): void {
    this._tracks = [];
    this._currentIndex = 0;
  }

  static create(id: string): Queue {
    return new Queue(id, [], "none");
  }

  static reconstitute(id: string, tracks: Track[], loopMode: LoopMode): Queue {
    return new Queue(id, tracks, loopMode);
  }
}
