import React from 'react';

export function detectUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;
  const matches = text.match(urlRegex) || [];
  return matches;
}

export function isYouTubeUrl(url: string): boolean {
  const youtubeRegex = /(?:youtube\.com\/(?:watch|shorts|live)|youtu\.be\/)/i;
  return youtubeRegex.test(url);
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