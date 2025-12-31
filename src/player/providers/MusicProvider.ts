import { type TrackData } from "../Track";

export abstract class MusicProvider {
  static async searchSong(
    _query: string,
    _options?: { limit?: number },
  ): Promise<Omit<TrackData, "requestedBy">[]> {
    throw new Error("Not implemented searchSong function");
  }
}
