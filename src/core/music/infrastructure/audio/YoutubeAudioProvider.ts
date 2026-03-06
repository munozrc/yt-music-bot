import type { Track } from "../../domain/entities/Track";
import type {
  AudioProvider,
  AudioStream,
} from "../../domain/repositories/AudioProvider";

export class YoutubeAudioProvider implements AudioProvider {
  private static readonly YOUTUBE_REGEX =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;

  supports(query: string): boolean {
    // Accepts YouTube URLs or plain search terms (fallback provider)
    return (
      YoutubeAudioProvider.YOUTUBE_REGEX.test(query) ||
      !query.startsWith("http")
    );
  }

  resolve(query: string, requestedBy: string): Promise<Track> {
    console.log(
      `[YoutubeAudioProvider] Resolving query: "${query}" for user ${requestedBy}`,
    );
    throw new Error("Method not implemented.");
  }
  stream(track: Track): Promise<AudioStream> {
    console.log(
      `[YoutubeAudioProvider] Streaming track: "${track.title}" (${track.url})`,
    );
    throw new Error("Method not implemented.");
  }
}
