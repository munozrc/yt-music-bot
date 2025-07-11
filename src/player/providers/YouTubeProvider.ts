import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";

import { Innertube, UniversalCache } from "youtubei.js";
import { type MusicResponsiveListItem } from "youtubei.js/dist/src/parser/nodes";

import { logger } from "../../utils/logger";
import { type TrackData } from "../Track";
import { MusicProvider } from "./MusicProvider";

export class YouTubeProvider implements MusicProvider {
  private static instance?: Innertube;

  static async init() {
    if (!this.instance) {
      this.instance = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
      });
    }
  }

  static async searchSong(
    query: string,
    options: { limit?: number } = {},
  ): Promise<Omit<TrackData, "requestedBy">[]> {
    if (!this.instance) {
      throw new Error("YouTubeProvider not initialized");
    }

    const limit = options.limit ?? 5;
    const search = await this.instance!.music.search(query, { type: "song" });
    const results = search.songs?.contents ?? [];

    if (!results.length) {
      logger.info(`No results were found for query: "${query}"`);
      return [];
    }

    const songs = results
      .filter((item: MusicResponsiveListItem) =>
        Boolean(
          item.duration?.seconds &&
            item.thumbnails?.[0]?.url &&
            item.artists?.length &&
            item.title &&
            item.id,
        ),
      )
      .map((item: NonNullable<MusicResponsiveListItem>) => ({
        title: item.title!,
        artist: item.artists!.map((a) => a.name).join(" & ") ?? "Unknown",
        duration: item.duration?.seconds ?? 0,
        thumbnail: item.thumbnails![0]!.url,
        provider: "YouTubeProvider",
        url: item.id!,
      }))
      .slice(0, limit);

    return songs;
  }

  static async getStream(videoId: TrackData["url"]): Promise<Readable> {
    if (!this.instance) {
      throw new Error("YouTubeProvider not initialized");
    }

    try {
      logger.debug(`Get stream for url=${videoId}`);
      const ytStream = await this.instance.download(videoId, {
        type: "audio", // audio, video or video+audio
        quality: "best", // best, bestefficiency, 144p, 240p, 480p, 720p and so on.
        client: "YTMUSIC",
        format: "mp4",
      });

      return Readable.fromWeb(ytStream as ReadableStream);
    } catch (error) {
      logger.error(`Failed to get audio stream from URL: ${videoId}`, error);
      throw new Error(`Failed to get audio stream from URL: ${videoId}`);
    }
  }
}
