import React from 'react';
import { extractVideoId } from './videoUtils';

export function detectUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;
  const matches = text.match(urlRegex) || [];
  return matches;
}

export function isYouTubeUrl(url: string): boolean {
  const youtubeRegex = /(?:youtube\.com\/(?:watch|shorts|live|channel|@|playlist|user|c)|youtu\.be\/)/i;
  return youtubeRegex.test(url);
}

export type YouTubeUrlType = 'video' | 'channel' | 'playlist';

export interface YouTubeUrlInfo {
  type: YouTubeUrlType;
  videoId?: string;
  channelId?: string;
  playlistId?: string;
  originalUrl: string;
}

export function classifyYouTubeUrl(url: string): YouTubeUrlInfo | null {
  if (!isYouTubeUrl(url)) return null;

  try {
    const u = new URL(url);

    if (u.pathname.startsWith('/playlist')) {
      const list = u.searchParams.get('list');
      if (list) {
        return { type: 'playlist', playlistId: list, originalUrl: url };
      }
    }

    const channelMatch = u.pathname.match(/^\/channel\/(UC[\w-]+)/);
    if (channelMatch) {
      return { type: 'channel', channelId: channelMatch[1], originalUrl: url };
    }

    const handleMatch = u.pathname.match(/^\/(@[\w.\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF-]+)/);
    if (handleMatch) {
      return { type: 'channel', channelId: handleMatch[1], originalUrl: url };
    }

    const userMatch = u.pathname.match(/^\/user\/([\w.-]+)/);
    if (userMatch) {
      return { type: 'channel', channelId: userMatch[1], originalUrl: url };
    }

    const cMatch = u.pathname.match(/^\/c\/([\w.-]+)/);
    if (cMatch) {
      return { type: 'channel', channelId: cMatch[1], originalUrl: url };
    }

    const videoId = extractVideoId(url);
    if (videoId) {
      return { type: 'video', videoId, originalUrl: url };
    }

    return null;
  } catch {
    /* URL parse failed */
  }

  const channelRegex = /youtube\.com\/channel\/(UC[\w-]+)/;
  const channelMatch = url.match(channelRegex);
  if (channelMatch) {
    return { type: 'channel', channelId: channelMatch[1], originalUrl: url };
  }

  const handleRegex = /youtube\.com\/(@[\w.\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF-]+)/;
  const handleMatch = url.match(handleRegex);
  if (handleMatch) {
    return { type: 'channel', channelId: handleMatch[1], originalUrl: url };
  }

  const playlistRegex = /youtube\.com\/playlist\?list=([\w-]+)/;
  const playlistMatch = url.match(playlistRegex);
  if (playlistMatch) {
    return { type: 'playlist', playlistId: playlistMatch[1], originalUrl: url };
  }

  const videoId = extractVideoId(url);
  if (videoId) {
    return { type: 'video', videoId, originalUrl: url };
  }

  return null;
}

export function renderTextWithLinks(text: string, onLinkClick: (url: string) => void): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const urlMatches = detectUrls(text);
  
  if (urlMatches.length === 0) {
    return [<span key="text">{text}</span>];
  }
  
  let lastIndex = 0;
  urlMatches.forEach((url, index) => {
    const urlIndex = text.indexOf(url, lastIndex);
    if (urlIndex === -1) return;
    
    if (urlIndex > lastIndex) {
      parts.push(<span key={`text-${index}`}>{text.substring(lastIndex, urlIndex)}</span>);
    }
    
    parts.push(
      <a
        key={`link-${index}`}
        href={url}
        onClick={(e) => {
          e.preventDefault();
          onLinkClick(url);
        }}
        className="text-brand-coral hover:text-brand-pink hover:underline font-medium transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {url}
      </a>
    );
    
    lastIndex = urlIndex + url.length;
  });
  
  if (lastIndex < text.length) {
    parts.push(<span key="text-tail">{text.substring(lastIndex)}</span>);
  }
  
  return parts;
}