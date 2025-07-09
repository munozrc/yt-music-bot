import { Innertube, UniversalCache } from "youtubei.js";
import { type MusicResponsiveListItem } from "youtubei.js/dist/src/parser/nodes";

import { logger } from "../../utils/logger";
import { MusicProvider, Song } from "./MusicProvider";

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
  ): Promise<Song[]> {
    this.ensureInitialized();

    const limit = options.limit ?? 5;
    const search = await this.instance!.music.search(query, { type: "song" });
    const results = search.songs?.contents ?? [];

    if (!results.length) {
      logger.debug(`No results were found for query: "${query}"`);
      return [];
    }

    const songs = results
      .filter(this.isValidResult)
      .map(this.toSong)
      .slice(0, limit);

    return songs;
  }

  private static ensureInitialized(): void {
    if (!this.instance) {
      throw new Error("YouTubeProvider not initialized");
    }
  }

  private static isValidResult(result: MusicResponsiveListItem): boolean {
    return Boolean(
      result.album?.name &&
        result.artists?.length &&
        result.duration?.seconds &&
        result.id &&
        result.thumbnails?.[0]?.url &&
        result.title,
    );
  }

  private static toSong(result: NonNullable<MusicResponsiveListItem>): Song {
    return {
      id: result.id!,
      title: result.title!,
      artist: result.artists!.map((artist) => artist.name).join(" & "),
      album: result.album!.name,
      duration: result.duration!.seconds,
      thumbnailUrl: result.thumbnails![0]!.url,
      provider: "YouTubeProvider",
    };
  }
}
