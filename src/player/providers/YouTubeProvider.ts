import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Stream, { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { Innertube, UniversalCache } from "youtubei.js";
import { type MusicResponsiveListItem } from "youtubei.js/dist/src/parser/nodes";

import { logger } from "../../utils/logger";
import { type TrackData } from "../Track";
import { MusicProvider } from "./MusicProvider";

export class YouTubeProvider implements MusicProvider {
  private static instance?: Innertube;

  static async init() {
    try {
      if (!this.instance) {
        this.instance = await Innertube.create({
          cache: new UniversalCache(false),
          generate_session_locally: true,
        });
      }
    } catch (error) {
      logger.error("Error initializing YouTubeProvider: ", error);
      throw new Error("Failed to initialize YouTubeProvider");
    }
  }

  static async searchSong(
    query: string,
    options: { limit?: number } = {},
  ): Promise<Omit<TrackData, "requestedBy">[]> {
    if (!this.instance) {
      throw new Error("YouTubeProvider not initialized");
    }

    const search = await this.instance.music.search(query, { type: "song" });
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
        artist: item.artists?.map((a) => a.name).join(" & ") ?? "Unknown",
        duration: item.duration?.seconds ?? 0,
        thumbnail: item.thumbnails![0]!.url,
        url: item.id!,
      }))
      .slice(0, options.limit ?? 5);

    return songs;
  }

  static async getStream(videoId: TrackData["url"]): Promise<Stream.Readable> {
    if (!this.instance) {
      throw new Error("YouTubeProvider not initialized");
    }

    try {
      logger.debug(`Get stream for url=${videoId}`);
      const streamedTrackWeb = await this.instance.download(videoId, {
        type: "video+audio",
        quality: "bestefficiency",
        client: "YTMUSIC",
        format: "mp4",
      });

      const streamedTrack = Readable.from(streamedTrackWeb);
      const bufferStream = new PassThrough();

      streamedTrack.pipe(bufferStream);

      streamedTrack.on("error", (err) => {
        logger.error(`Stream error for videoId=${videoId}`, err);
        bufferStream.destroy(err);
      });

      return bufferStream;
    } catch (error) {
      logger.error(`Failed to get audio stream from URL: ${videoId}`, error);
      throw new Error(`Failed to get audio stream from URL: ${videoId}`);
    }
  }

  static async downloadAndCache(videoId: string): Promise<string> {
    if (!this.instance) {
      throw new Error("YouTubeProvider not initialized");
    }

    const cacheDir = path.resolve(process.cwd(), ".cache");
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir);
    }

    const filename = `yt-provider-${videoId}.m4a`;
    const filePath = path.resolve(cacheDir, filename);

    if (existsSync(filePath)) {
      logger.debug(`Reusing cached file: ${filePath}`);
      return filePath;
    }

    try {
      logger.debug(`Downloading ${videoId} to ${filename}...`);
      const stream = await this.instance.download(videoId, {
        type: "video+audio",
        quality: "bestefficiency",
        client: "YTMUSIC",
        format: "mp4",
      });

      const writable = createWriteStream(filePath);
      await pipeline(stream, writable);

      logger.debug(`Downloaded and cached: ${filename}`);
      return filePath;
    } catch (error) {
      logger.error(`Failed to download ${videoId}:`, error);
      throw new Error(`Failed to download and cache track: ${videoId}`);
    }
  }
}
