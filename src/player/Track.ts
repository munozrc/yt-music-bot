export interface TrackData {
  title: string;
  url: string;
  artist: string;
  duration: number;
  requestedBy: string;
  thumbnail: string;
}

export class Track implements TrackData {
  public readonly title: string;
  public readonly url: string;
  public readonly duration: number;
  public readonly requestedBy: string;
  public readonly thumbnail: string;
  public readonly artist: string;

  constructor(data: TrackData) {
    this.duration = data.duration;
    this.requestedBy = data.requestedBy;
    this.thumbnail = data.thumbnail;
    this.artist = data.artist;
    this.title = data.title;
    this.url = data.url;
  }

  get formattedDuration(): string {
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  public toString(): string {
    return `**${this.artist}** - ${this.title} \`${this.formattedDuration}\``;
  }
}
