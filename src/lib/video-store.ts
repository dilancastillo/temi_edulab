/**
 * In-memory store for uploaded videos.
 * Videos are stored as ArrayBuffers keyed by a random ID.
 * This is a server-side singleton — works for single-instance dev/demo deployments.
 */

type VideoEntry = {
  buffer: ArrayBuffer;
  mimeType: string;
  filename: string;
};

class VideoStore {
  private store = new Map<string, VideoEntry>();

  set(id: string, entry: VideoEntry): void {
    this.store.set(id, entry);
  }

  get(id: string): VideoEntry | undefined {
    return this.store.get(id);
  }

  delete(id: string): void {
    this.store.delete(id);
  }
}

// Singleton — persists across requests in the same Node.js process
export const videoStore = new VideoStore();
