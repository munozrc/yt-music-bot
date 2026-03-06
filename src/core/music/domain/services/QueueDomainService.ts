import type { Queue } from "../entities/Queue";
import type { Track } from "../entities/Track";

/**
 * QueueDomainService encapsulates domain logic that doesn't naturally
 * belong to a single entity — typically operations spanning multiple
 * aggregates or requiring external coordination that is still pure domain logic.
 */
export class QueueDomainService {
  /**
   * Inserts a track at a specific position in the queue.
   * Throws if the position is out of bounds.
   */
  insertAt(queue: Queue, track: Track, position: number): void {
    const tracks = [...queue.allTracks];

    if (position < 0 || position > tracks.length) {
      throw new Error(
        `Cannot insert at position ${position}: queue has ${tracks.length} tracks`,
      );
    }

    // We clear and rebuild because Queue manages internal array
    queue.clear();
    tracks.splice(position, 0, track);
    queue.enqueueMany(tracks);
  }

  /**
   * Returns the estimated wait time before a track at a given index starts playing.
   * Takes into account the remaining time of the current track.
   */
  estimatedWaitTime(
    queue: Queue,
    targetIndex: number,
    currentTrackElapsedSeconds: number,
  ): number {
    const tracks = queue.allTracks;

    if (targetIndex <= 0 || targetIndex >= tracks.length) {
      return 0;
    }

    const currentTrack = tracks[0];
    const remainingCurrent = currentTrack
      ? Math.max(0, currentTrack.durationSeconds - currentTrackElapsedSeconds)
      : 0;

    const intermediateSeconds = tracks
      .slice(1, targetIndex)
      .reduce((acc, t) => acc + t.durationSeconds, 0);

    return remainingCurrent + intermediateSeconds;
  }

  /**
   * Checks whether a user has exceeded the maximum allowed tracks in the queue.
   */
  userExceedsTrackLimit(
    queue: Queue,
    userId: string,
    maxTracksPerUser: number,
  ): boolean {
    const userTrackCount = queue.allTracks.filter(
      (t) => t.requestedBy === userId,
    ).length;

    return userTrackCount >= maxTracksPerUser;
  }

  /**
   * Deduplicates a queue by removing tracks with the same URL.
   * Keeps the first occurrence.
   */
  removeDuplicates(queue: Queue): number {
    const seen = new Set<string>();
    const tracks = [...queue.allTracks];

    const unique = tracks.filter((track) => {
      if (seen.has(track.url.getValue())) return false;
      seen.add(track.url.getValue());
      return true;
    });

    const removedCount = tracks.length - unique.length;

    if (removedCount > 0) {
      queue.clear();
      queue.enqueueMany(unique);
    }

    return removedCount;
  }
}
