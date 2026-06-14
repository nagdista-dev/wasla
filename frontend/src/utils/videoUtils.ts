import type { LatestVideo } from '../types';

/**
 * Extract a YouTube video ID from any URL format:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // ?v= param (standard watch URL)
    const v = u.searchParams.get('v');
    if (v && v.length === 11) return v;
    // path-based (youtu.be, /embed/, /shorts/)
    const pathMatch = u.pathname.match(/\/(?:embed|shorts|v)\/([A-Za-z0-9_-]{11})/);
    if (pathMatch) return pathMatch[1];
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '');
      if (id.length === 11) return id;
    }
  } catch {
    // URL parse failed — try regex on raw string
  }
  // Regex fallback for malformed/relative URLs
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const m = url.match(pattern);
    if (m) return m[1];
  }
  return null;
}

/**
 * Build a canonical YouTube watch URL for a given video ID.
 */
export function buildWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Normalize a LatestVideo object so it ALWAYS has:
 *  - a valid `link` pointing to a watch URL (watch?v=VIDEO_ID)
 *
 * Returns null if the video cannot be resolved to a valid playable video.
 * Never fetches externally — purely derives from existing fields.
 */
export function normalizeVideo(video: LatestVideo): (LatestVideo & { _videoId: string }) | null {
  // Try to extract video ID from the link
  let videoId = extractVideoId(video.link);

  if (!videoId) {
    // No valid ID could be derived — video is unplayable, skip gracefully
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Wasla] Could not resolve videoId for:', video.link, video.title);
    }
    return null;
  }

  return {
    ...video,
    link: buildWatchUrl(videoId),   // always canonical
    _videoId: videoId,
  };
}
