export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumbnailUrl: string;
  provider: string;
  url?: string;
  explicit?: boolean;
  releaseDate?: string;
  genres?: string[];
};

export abstract class MusicProvider {
  static async searchSong(
    _query: string,
    _options?: { limit?: number },
  ): Promise<Song[]> {
    throw new Error("Not implemented query, options");
  }
}
