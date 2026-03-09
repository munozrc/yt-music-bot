import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import Innertube, {
  Platform,
  type Types,
  UniversalCache,
  Utils,
} from "youtubei.js";

import { logger } from "@/config/logger";

import { Track } from "../../domain/entities/Track";
import type {
  AudioProvider,
  AudioStream,
} from "../../domain/repositories/AudioProvider";
import { TrackUrl } from "../../domain/value-objects/TrackUrl";

export class YoutubeAudioProvider implements AudioProvider {
  private client: Innertube;
  private static readonly YOUTUBE_REGEX =
    /^(https?:\/\/)?((www\.|music\.)?youtube\.com|youtu\.be)\/.+/;

  private constructor(innertube: Innertube) {
    this.client = innertube;
  }

  /**
   * Factory method to create an instance of YoutubeAudioProvider.
   * @returns A promise that resolves to a YoutubeAudioProvider instance.
   */
  static async create(): Promise<YoutubeAudioProvider> {
    // Setup eval shim for youtubei.js
    Platform.shim.eval = async (
      data: Types.BuildScriptResult,
      env: Record<string, Types.VMPrimative>,
    ) => {
      const properties = [];
      if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
      if (env.sig)
        properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
      const code = `${data.output}\nreturn { ${properties.join(", ")} }`;
      return new Function(code)();
    };

    const innertube = await Innertube.create({
      cache: new UniversalCache(true),
      player_id: "140dafda",
    });

    return new YoutubeAudioProvider(innertube);
  }

  supports(query: string): boolean {
    // Accepts YouTube URLs or plain search terms (fallback provider)
    return (
      YoutubeAudioProvider.YOUTUBE_REGEX.test(query) ||
      !query.startsWith("http")
    );
  }

  async resolve(query: string, requestedBy: string): Promise<Track> {
    try {
      if (
        YoutubeAudioProvider.YOUTUBE_REGEX.test(query) &&
        !query.startsWith("http")
      ) {
        const videoId = this.extractVideoId(query);
        return this.getVideoInfo(videoId, requestedBy);
      }

      // When query is not a URL, treat it as a search term and take the first result
      const [firstResult] = await this.search(query, requestedBy, 1);
      if (!firstResult) {
        throw new Error("No search results found for query: " + query);
      }

      return firstResult;
    } catch (error) {
      logger.error(`Failed to resolve track for query: ${query}`, error);
      throw new Error(`Failed to resolve track for query: ${query}`);
    }
  }

  async stream(track: Track): Promise<AudioStream> {
    try {
      const cacheDir = path.resolve(process.cwd(), ".cache");
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir);
      }

      const videoId = this.extractVideoId(track.url.getValue());
      const filename = `yt-provider-${videoId}.mp4`;
      const filePath = path.resolve(cacheDir, filename);

      if (existsSync(filePath)) {
        return {
          resource: filePath,
          mimeType: "audio/mp4",
        };
      }

      logger.debug(`Downloading ${videoId} to ${filename}...`);

      const audioStream = await this.client.download(videoId, {
        type: "video+audio",
        quality: "bestefficiency",
        client: "YTMUSIC",
        format: "mp4",
      });

      const tempWrite = createWriteStream(filePath, {
        encoding: "binary",
        flags: "w",
      });

      // Write the audio stream to the temporary file
      for await (const chunk of Utils.streamToIterable(audioStream)) {
        tempWrite.write(chunk);
      }

      // Finalize the write stream
      tempWrite.end();
      logger.debug(`Downloaded and cached: ${filename}`);

      return {
        resource: filePath,
        mimeType: "audio/mp4",
      };
    } catch (error) {
      logger.error(`Failed to download ${track.title}:`, error);
      throw new Error(`Failed to download and cache track: ${track.title}`);
    }
  }

  async getRecommendations(seedTrack: Track, count: number): Promise<Track[]> {
    try {
      const videoId = this.extractVideoId(seedTrack.url.getValue());
      const upNext = await this.client.music.getUpNext(videoId, true);
      const contents = upNext?.contents ?? [];

      const normalizeContents = contents
        .filter((item) => item.key("video_id")?.string() !== videoId)
        .slice(0, count);

      return normalizeContents.map((song) => {
        const duration = song.key("duration")?.object() as { seconds: number };
        const titleObj = song.key("title")?.object() as { text: string };
        const thumbnail = song.key("thumbnail").array()[0]?.url || "";
        const artists =
          song
            .key("artists")
            ?.array()
            ?.map((a) => a.name)
            .join(" & ") || "Unknown";

        return Track.create(
          this.extractVideoId(song.key("video_id")?.string() ?? ""),
          {
            title: titleObj.text ?? "Unknown Title",
            thumbnailUrl: thumbnail,
            durationSeconds: duration.seconds ?? 0,
            url: TrackUrl.create(
              `https://www.youtube.com/watch?v=${song.key("video_id")?.string()}`,
            ),
            author: artists,
            requestedBy: "bot",
          },
        );
      });
    } catch (error) {
      logger.error(
        `Failed to get recommendations from track: ${seedTrack.id}`,
        error,
      );
      throw new Error(
        `Failed to get recommendations from track: ${seedTrack.id}`,
      );
    }
  }

  private extractVideoId(url: string): string {
    const urlParams = new URLSearchParams(new URL(url).search);
    const videoId = urlParams.get("v");

    if (!videoId) {
      throw new Error("Video ID not found in URL");
    }

    return videoId;
  }

  private async getVideoInfo(
    videoId: string,
    requestBy: string,
  ): Promise<Track> {
    try {
      const result = await this.client.getBasicInfo(videoId);

      const { title, channel, author, thumbnail, duration } =
        result.basic_info || {};

      const authorName = author ?? channel?.name;
      const thumbnailUrl = thumbnail?.[0]?.url ?? "";

      if (
        !title ||
        !authorName ||
        !thumbnailUrl ||
        !duration ||
        !videoId ||
        duration <= 0
      ) {
        throw new Error("Could not extract video info");
      }

      return Track.create(videoId, {
        title,
        thumbnailUrl,
        durationSeconds: duration ?? 0,
        url: TrackUrl.create(`https://www.youtube.com/watch?v=${videoId}`),
        requestedBy: requestBy,
        author: authorName,
      });
    } catch (error) {
      logger.error(`Failed to get video info for video ID: ${videoId}`, error);
      throw new Error(`Failed to get video info for video ID: ${videoId}`);
    }
  }

  /**
   * Searches YouTube for videos matching the query and returns a list of tracks.
   * @returns A promise that resolves to an array of Track objects matching the search query.
   */
  private async search(
    query: string,
    requestedBy: string,
    limit: number,
  ): Promise<Track[]> {
    try {
      const result = await this.client.search(query, { type: "video" });
      const videos = result.videos.slice(0, limit) ?? [];

      const tracks = videos.map((video) => {
        const video_id = video.key("video_id")?.string() ?? "";
        const duration = video.key("duration")?.object() as { seconds: number };
        const title = video.key("title")?.object() as { text: string };
        const author = video.key("author")?.object() as { name: string };

        return Track.create(video_id, {
          title: title?.text ?? "",
          thumbnailUrl: "",
          durationSeconds: duration.seconds ?? 0,
          url: TrackUrl.create(`https://www.youtube.com/watch?v=${video_id}`),
          author: author?.name ?? "",
          requestedBy,
        });
      });

      return tracks;
    } catch (error) {
      logger.error(`Failed to search for tracks: ${query}`, error);
      throw new Error(`Failed to search for tracks: ${query}`);
    }
  }
}
