import { Track } from "./Track";

export class Queue {
  private tracks: Track[] = [];
  private currentIndex = 0;

  get current(): Track | null {
    return this.tracks[this.currentIndex] || null;
  }

  get next(): Track | null {
    return this.tracks[this.currentIndex++] || null;
  }

  get isEmpty(): boolean {
    return this.tracks.length === 0;
  }

  add(track: Track): void {
    this.tracks.push(track);
  }

  advance(): void {
    this.currentIndex++;
  }

  reset(): void {
    this.currentIndex = 0;
  }

  clear(): void {
    this.currentIndex = 0;
    this.tracks = [];
  }

  shuffle(): void {
    const current = this.tracks[this.currentIndex];
    const remaining = this.tracks.slice(this.currentIndex + 1);

    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    this.tracks = [current, ...remaining];
  }

  public toString(): string {
    return this.tracks
      .map((track, index) => {
        const prefix = index === this.currentIndex ? "▶️" : `${index + 1}.`;
        return `${prefix} **${track.title}** (requested by ${track.requestedBy})`;
      })
      .join("\n");
  }
}
