import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { Innertube, Platform, type Types, UniversalCache } from "youtubei.js";

import { logger } from "../../utils/logger";
import { Track } from "../Track";
import { MusicProvider } from "./MusicProvider";

Platform.shim.eval = async (
  data: Types.BuildScriptResult,
  env: Record<string, Types.VMPrimative>,
) => {
  const properties = [];
  if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
  if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
  const code = `${data.output}\nreturn { ${properties.join(", ")} }`;
  return new Function(code)();
};

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
  ): Promise<Track[]> {
    if (!this.instance) {
      throw new Error("YouTubeProvider not initialized");
    }

    const { limit = 5 } = options;

    const search = await this.instance.music.search(query, { type: "song" });
    const results = search.songs?.contents ?? [];

    if (!results.length) {
      logger.info(`No results found for query: "${query}"`);
      return [];
    }

    return results
      .slice(0, limit)
      .map(({ title, id, duration, thumbnails, artists }) => {
        return new Track({
          title: title ?? "Unknown Title",
          artist: artists?.map((a) => a.name).join(" & ") || "Unknown",
          duration: duration?.seconds ?? 0,
          thumbnail: thumbnails?.[0]?.url ?? "https://default-thumbnail.png",
          requestedBy: "",
          url: id!,
        });
      });
  }

  static async getRecommendations(
    videoId: string,
    options: { limit?: number } = {},
  ): Promise<Track[]> {
    if (!this.instance) {
      throw new Error("YouTubeProvider not initialized");
    }

    const { limit = 10 } = options;

    try {
      const upNext = await this.instance.music.getUpNext(videoId, true);
      const contents = upNext?.contents ?? [];

      const normalizeContents = contents
        .filter((item) => item.key("video_id")?.string() !== videoId)
        .slice(0, limit);

      return normalizeContents.map((item) => {
        const duration = item.key("duration")?.object() as { seconds: number };
        const titleObj = item.key("title")?.object() as { text: string };
        const thumbnail = item.key("thumbnail").array()[0]?.url || "";
        const artists =
          item
            .key("artists")
            ?.array()
            ?.map((a) => a.name)
            .join(" & ") || "Unknown";

        return new Track({
          artist: artists,
          duration: duration.seconds ?? 0,
          title: titleObj.text ?? "Unknown Title",
          url: item.key("video_id")?.string(),
          requestedBy: "",
          thumbnail,
        });
      });
    } catch (error) {
      logger.error(`Failed to get recommendations from URL: ${videoId}`, error);
      throw new Error(`Failed to get recommendations from URL: ${videoId}`);
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
      logger.debug(`Reusing cached file: ${filename}`);
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
