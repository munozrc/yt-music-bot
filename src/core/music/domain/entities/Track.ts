import { Entity } from "@/core/shared/domain/Entity";

import type { TrackUrl } from "../value-objects/TrackUrl";

export interface TrackProps {
  url: TrackUrl;
  title: string;
  author: string;
  durationSeconds: number;
  requestedBy: string; // Discord user ID
  thumbnailUrl: string;
}

export class Track extends Entity<string> {
  private readonly _url: TrackUrl;
  private readonly _title: string;
  private readonly _durationSeconds: number;
  private readonly _requestedBy: string;
  private readonly _thumbnailUrl: string;

  private constructor(id: string, props: TrackProps) {
    super(id);
    this._url = props.url;
    this._title = props.title;
    this._durationSeconds = props.durationSeconds;
    this._requestedBy = props.requestedBy;
    this._thumbnailUrl = props.thumbnailUrl;
  }

  get url(): TrackUrl {
    return this._url;
  }

  get title(): string {
    return this._title;
  }

  get durationSeconds(): number {
    return this._durationSeconds;
  }

  get requestedBy(): string {
    return this._requestedBy;
  }

  get thumbnailUrl(): string | undefined {
    return this._thumbnailUrl;
  }

  get formattedDuration(): string {
    const minutes = Math.floor(this._durationSeconds / 60);
    const seconds = this._durationSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  static create(id: string, props: TrackProps): Track {
    if (props.durationSeconds < 0) {
      throw new Error("Track duration cannot be negative");
    }
    return new Track(id, props);
  }

  static reconstitute(id: string, props: TrackProps): Track {
    return new Track(id, props);
  }
}
