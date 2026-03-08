import type Stream from "node:stream";

import type { Track } from "../entities/Track";

/**
 * Abstraction for fetching and streaming audio from various sources (e.g. YouTube, Spotify).
 * Decouples the MusicSession from specific audio providers, allowing for flexibility and extensibility.
 */
export interface AudioStream {
  /** Readable stream or URL ready to be fed to @discordjs/voice */
  resource: Stream.Readable | string;
  mimeType: "audio/webm" | "audio/ogg" | "audio/mp4" | "audio/mpeg";
}

export interface AudioProvider {
  /**
   * Resolves a query (URL or search term) into a Track entity.
   * Does NOT start playback — only fetches metadata.
   */
  resolve(query: string, requestedBy: string): Promise<Track>;

  /**
   * Returns a streamable audio resource for the given track.
   */
  stream(track: Track): Promise<AudioStream>;

  /**
   * Whether this provider can handle the given query.
   */
  supports(query: string): boolean;

  /**
   * Get recommended tracks based on a seed track (e.g. for autoplay).
   */
  getRecommendations(seedTrack: Track, count: number): Promise<Track[]>;
}
