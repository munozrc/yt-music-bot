import { Track } from "./Track";

export class Queue {
  private tracks: Track[] = [];
  private currentIndex = 0;

  add(track: Track): void {
    this.tracks.push(track);
  }

  get next(): Track | null {
    return this.tracks[this.currentIndex++] || null;
  }

  get current(): Track | null {
    return this.tracks[this.currentIndex] || null;
  }

  get isEmpty(): boolean {
    return this.tracks.length === 0 || this.currentIndex >= this.tracks.length;
  }

  clear(): void {
    this.tracks = [];
    this.currentIndex = 0;
  }

  shuffle(): void {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }
}
