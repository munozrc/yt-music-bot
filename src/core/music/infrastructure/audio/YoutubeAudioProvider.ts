import Innertube, { UniversalCache, YTNodes } from "youtubei.js";

import { Track } from "../../domain/entities/Track";
import type {
  AudioProvider,
  AudioStream,
} from "../../domain/repositories/AudioProvider";
import { TrackUrl } from "../../domain/value-objects/TrackUrl";

export class YoutubeAudioProvider implements AudioProvider {
  private client: Innertube;
  private static readonly YOUTUBE_REGEX =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;

  private constructor(innertube: Innertube) {
    this.client = innertube;
  }

  /**
   * Factory method to create an instance of YoutubeAudioProvider.
   * @returns A promise that resolves to a YoutubeAudioProvider instance.
   */
  static async create(): Promise<YoutubeAudioProvider> {
    // Setup eval shim for youtubei.js
    const { Platform } = await import("youtubei.js");

    Platform.shim.eval = async (data, env) => {
      const properties = [];
      if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
      if (env.sig)
        properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
      const code = `${data.output}\nreturn { ${properties.join(", ")} }`;
      return new Function(code)();
    };

    const innertube = await Innertube.create({
      // user_agent: USER_AGENT,
      cache: new UniversalCache(true),
      // enable_session_cache: false,
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
    const results = await this.client.music.search(query);

    // Navigate to the MusicShelf node containing the search results
    const musicShelf = results.contents?.[1]?.as(YTNodes.MusicShelf);
    const rawItems =
      musicShelf?.contents.as(YTNodes.MusicResponsiveListItem) ?? [];

    // Map raw items to SearchResult format
    const songs = rawItems.map((item) => {
      const artists = item.artists?.length
        ? item.artists
            .map((artist) => artist.name ?? "Unknown Artist")
            .join(", ")
        : (item.author?.name ?? "Unknown Artist");

      return {
        artists,
        title: item.title ?? "Unknown Title",
        videoId: item.id,
      };
    });

    const [firstSong] = songs.filter((song) => song.videoId);
    if (!firstSong) {
      throw new Error(`No valid YouTube results found for query: "${query}"`);
    }

    return Track.create(firstSong.videoId ?? "", {
      title: firstSong.title,
      thumbnailUrl: `https://i.ytimg.com/vi/${firstSong.videoId}/hqdefault.jpg`,
      durationSeconds: 0,
      url: TrackUrl.create(
        `https://www.youtube.com/watch?v=${firstSong.videoId}`,
      ),
      author: firstSong.artists,
      requestedBy,
    });
  }

  stream(): Promise<AudioStream> {
    return Promise.resolve({
      resource: "C:\\Users\\munozrc\\Pictures\\01 - everything i wanted.mp3",
      mimeType: "audio/mpeg",
    });
  }
}
