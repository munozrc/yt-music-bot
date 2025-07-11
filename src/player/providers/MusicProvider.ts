import { type TrackData } from "../Track";

export abstract class MusicProvider {
  static async searchSong(
    _query: string,
    _options?: { limit?: number },
  ): Promise<Omit<TrackData, "requestedBy">[]> {
    throw new Error("Not implemented searchSong function");
  }

  static async getStream(
    _url: TrackData["url"],
  ): Promise<ReadableStream<Uint8Array>> {
    throw new Error("Not implemented getStream function");
  }
}
