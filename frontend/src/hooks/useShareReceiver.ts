import { useEffect, useState } from 'react';
import { extractVideoId } from '../utils/videoUtils';

export type SharedLinkType = 'video' | 'channel' | 'playlist';

export interface SharedYouTubeLink {
  rawUrl: string;
  type: SharedLinkType;
  extractedId: string | null;
  sharedTitle?: string;
}

/**
 * Detects incoming YouTube links via the Web Share Target API (GET params)
 * or any ?share-url= / ?url= query parameter containing a YouTube URL.
 *
 * Returns the parsed link data and a dismiss function.
 * Automatically cleans the URL search params so the modal won't
 * re-appear on soft navigation.
 */
export function useShareReceiver() {
  const [sharedLink, setSharedLink] = useState<SharedYouTubeLink | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Web Share Target v1 GET params as declared in manifest.json
    const shareUrl = params.get('share-url') || '';
    const shareText = params.get('share-text') || '';
    const shareTitle = params.get('share-title') || '';

    // Also accept a plain ?url= for manual testing / deep-linking
    const plainUrl = params.get('url') || '';

    // Find the first YouTube-like URL among all candidate strings
    const candidates = [shareUrl, shareText, plainUrl, shareTitle];
    let resolvedUrl = '';
    for (const candidate of candidates) {
      if (candidate && isYouTubeUrl(candidate)) {
        resolvedUrl = extractFirstUrl(candidate) || candidate;
        break;
      }
    }

    if (!resolvedUrl) return;

    let type: SharedLinkType = 'video';
    let extractedId: string | null = null;

    // Detect Playlist
    const playlistMatch = resolvedUrl.match(/[&?]list=([a-zA-Z0-9_-]+)/);
    // Detect Channel
    const channelMatch = resolvedUrl.match(/(?:youtube\.com\/)(?:@|channel\/|user\/|c\/)([^/?]+)/);
    const handleMatch = resolvedUrl.match(/youtube\.com\/(@[\w.-]+)/);
    
    if (playlistMatch) {
      type = 'playlist';
      extractedId = playlistMatch[1];
    } else if (handleMatch) {
      type = 'channel';
      extractedId = handleMatch[1];
    } else if (channelMatch) {
      type = 'channel';
      extractedId = channelMatch[1];
    } else {
      type = 'video';
      extractedId = extractVideoId(resolvedUrl);
    }

    setSharedLink({
      rawUrl: resolvedUrl,
      type,
      extractedId,
      sharedTitle: shareTitle || undefined,
    });

    // Clean params from the URL bar without a full navigation
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('share-url');
    cleanUrl.searchParams.delete('share-text');
    cleanUrl.searchParams.delete('share-title');
    cleanUrl.searchParams.delete('url');
    window.history.replaceState({}, '', cleanUrl.toString());
  }, []);

  const dismiss = () => setSharedLink(null);

  return { sharedLink, dismiss };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function isYouTubeUrl(text: string): boolean {
  return /youtube\.com|youtu\.be/i.test(text);
}

/** Extract the first URL-like token from a freeform text string. */
function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}
