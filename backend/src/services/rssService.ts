import { parseStringPromise } from 'xml2js';
import { ChannelFeedData, VideoData, PlaylistSummary } from '../types/index.js';
import { addRelativeTimeToVideos } from '../utils/dateUtils.js';

const CACHE_DURATION = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const FETCH_TIMEOUT = 10000;
const cache = new Map<string, { id: string; data: ChannelFeedData; timestamp: number }>();
const pendingRequests = new Map<string, Promise<ChannelFeedData>>();

const PLAYLIST_CACHE_DURATION = 5 * 60 * 1000;
const PLAYLIST_MAX_CACHE_SIZE = 100;
const playlistCache = new Map<string, { id: string; data: PlaylistSummary[]; timestamp: number }>();
const pendingPlaylistRequests = new Map<string, Promise<PlaylistSummary[]>>();

function getString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return getString(value[0]);
  return undefined;
}

function getLink(value: unknown, fallback: string): string {
  if (Array.isArray(value)) return getString(value[0]?.$?.href) || fallback;
  const obj = value as { $?: { href?: string } } | undefined;
  return getString(obj?.$?.href) || fallback;
}

function getThumbnail(value: unknown): string | undefined {
  if (Array.isArray(value)) return getString(value[0]?.$?.url);
  const obj = value as { $?: { url?: string } } | undefined;
  return getString(obj?.$?.url);
}

function getViews(value: unknown): number | undefined {
  if (Array.isArray(value)) {
    const str = getString(value[0]?.$?.views);
    return str ? parseInt(str, 10) : undefined;
  }
  const obj = value as { $?: { views?: string } } | undefined;
  return obj?.$?.views ? parseInt(obj.$.views, 10) : undefined;
}

function getDuration(value: unknown): string | undefined {
  if (Array.isArray(value)) return getString(value[0]?.$?.duration);
  const obj = value as { $?: { duration?: string } } | undefined;
  return getString(obj?.$?.duration);
}

/**
 * Extract YouTube video ID from an RSS entry.
 * Priority: yt:videoId field (always reliable) → link href parsing.
 * Returns undefined if genuinely not a video entry.
 */
function getVideoId(entry: Record<string, unknown>): string | undefined {
  // 1. yt:videoId — the canonical, always-present field in YouTube RSS
  const ytVideoId = getString(entry['yt:videoId']);
  if (ytVideoId) return ytVideoId;

  // 2. Fall back to parsing href from <link> element(s)
  const linkVal = entry.link;
  const hrefs: string[] = [];
  if (Array.isArray(linkVal)) {
    for (const l of linkVal) {
      const h = getString((l as { $?: { href?: string } })?.$?.href);
      if (h) hrefs.push(h);
    }
  } else {
    const h = getString((linkVal as { $?: { href?: string } } | undefined)?.$?.href);
    if (h) hrefs.push(h);
  }
  for (const href of hrefs) {
    try {
      const u = new URL(href);
      const v = u.searchParams.get('v');
      if (v) return v;
    } catch { /* ignore */ }
    const m = href.match(/youtu\.be\/([\w-]+)/);
    if (m) return m[1];
  }
  return undefined;
}

/** Build a canonical YouTube watch URL from a video ID */
function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export async function fetchChannelData(channelId: string): Promise<ChannelFeedData> {
  const cached = cache.get(channelId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return {
      ...cached.data,
      latestVideo: { ...cached.data.latestVideo },
      videos: cached.data.videos.map((video) => ({ ...video })),
      cached: true,
    };
  }

  const pending = pendingRequests.get(channelId);
  if (pending) {
    return pending;
  }

  const promise = fetchAndParseRSS(channelId);
  pendingRequests.set(channelId, promise);

  try {
    const data = await promise;
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(channelId, {
      id: channelId,
      data: {
        channelName: data.channelName,
        latestVideo: { ...data.latestVideo },
        videos: data.videos.map((video) => ({ ...video })),
      },
      timestamp: Date.now(),
    });
    return data;
  } finally {
    pendingRequests.delete(channelId);
  }
}

async function fetchAndParseRSS(channelId: string): Promise<ChannelFeedData> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Wasla/1.0)',
      Accept: 'application/xml, text/xml, */*',
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();
  const parsed = await parseStringPromise(xmlText, {
    explicitArray: false,
    ignoreAttrs: false,
    trim: true,
  });

  const entries = parsed?.feed?.entry;
  if (!entries) {
    throw new Error('No videos found in channel feed');
  }

  const entryList = Array.isArray(entries) ? entries : [entries];
  const channelName = getString(parsed?.feed?.title) || 'Unknown Channel';
  const videos = entryList
    .map((entry: Record<string, unknown>) => {
      const mediaGroup = (entry['media:group'] || {}) as Record<string, unknown>;
      const mediaCommunity = (mediaGroup['media:community'] || {}) as Record<string, unknown>;
      const title = getString(entry.title) || 'Untitled';
      const videoId = getVideoId(entry);
      // Always construct a valid watch URL; skip entries with no resolvable video ID
      const link = videoId ? watchUrl(videoId) : getLink(entry.link, `https://www.youtube.com/channel/${channelId}`);

      return {
        title,
        link,
        thumbnail: getThumbnail(mediaGroup['media:thumbnail']),
        publishedDate: getString(entry.published) || getString(entry.updated) || new Date().toISOString(),
        channelName,
        views: getViews(mediaCommunity['media:statistics']),
        duration: getDuration(mediaGroup['media:content']),
      };
    })
    .filter((v) => v.link.includes('watch?v='))  // only keep real playable video links
    .sort((a: VideoData, b: VideoData) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate));

  if (videos.length === 0) {
    throw new Error('No videos found in channel feed');
  }

  const videosWithRelativeTime = addRelativeTimeToVideos(videos);

  return {
    channelName,
    videos: videosWithRelativeTime,
    latestVideo: videosWithRelativeTime[0],
  };
}

export async function fetchPlaylistData(playlistId: string): Promise<{ playlistName: string; channelName?: string; videos: VideoData[] }> {
  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Wasla/1.0)',
      Accept: 'application/xml, text/xml, */*',
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist RSS feed: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();
  const parsed = await parseStringPromise(xmlText, {
    explicitArray: false,
    ignoreAttrs: false,
    trim: true,
  });

  const entries = parsed?.feed?.entry;
  if (!entries) {
    throw new Error('No videos found in playlist feed');
  }

  const entryList = Array.isArray(entries) ? entries : [entries];
  const playlistName = getString(parsed?.feed?.title) || 'Untitled Playlist';
  const channelName = getString(parsed?.feed?.author?.name) || getString(parsed?.feed?.author?.[0]?.name);

  const videos = entryList
    .map((entry: Record<string, unknown>) => {
      const mediaGroup = (entry['media:group'] || {}) as Record<string, unknown>;
      const mediaCommunity = (mediaGroup['media:community'] || {}) as Record<string, unknown>;
      const title = getString(entry.title) || 'Untitled';
      const videoId = getVideoId(entry);
      // Always construct a valid watch URL from the video ID
      const link = videoId ? watchUrl(videoId) : getLink(entry.link, '');

      return {
        title,
        link,
        thumbnail: getThumbnail(mediaGroup['media:thumbnail']),
        publishedDate: getString(entry.published) || getString(entry.updated) || new Date().toISOString(),
        channelName: channelName || getString((entry['media:group'] as Record<string, unknown>)?.['media:credit'] as unknown) || 'Unknown',
        views: getViews(mediaCommunity['media:statistics']),
        duration: getDuration(mediaGroup['media:content']),
      };
    })
    .filter((v) => v.link.includes('watch?v='));  // only real playable videos

  const videosWithRelativeTime = addRelativeTimeToVideos(videos);

  return {
    playlistName,
    channelName,
    videos: videosWithRelativeTime,
  };
}

export function clearAllCaches(): void {
  cache.clear();
  pendingRequests.clear();
  DETAILS_CACHE.clear();
  playlistCache.clear();
  pendingPlaylistRequests.clear();
}

export function getCacheStats(): { size: number; entries: Array<{ id: string; data: ChannelFeedData }> } {
  return {
    size: cache.size,
    entries: Array.from(cache.values()),
  };
}

export async function resolveChannelId(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim();
  
  const ucMatch = trimmed.match(/UC[\w-]{22,}/);
  if (ucMatch) {
    return ucMatch[0];
  }

  let handle: string | null = null;
  
  const handleMatch = trimmed.match(/^@?([\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF.-]+)$/);
  if (handleMatch) {
    handle = handleMatch[1];
  } else {
    const urlMatch = trimmed.match(/(?:youtube\.com\/)(?:@|channel\/|user\/|c\/)([^\/\?]+)/);
    if (urlMatch) {
      const path = urlMatch[1];
      if (path.startsWith('UC')) return path;
      handle = path;
    }
  }

  if (handle) {
    return await fetchChannelIdFromHtml(handle);
  }

  return null;
}

async function fetchChannelIdFromHtml(handle: string): Promise<string | null> {
  try {
    const urls = [
      `https://www.youtube.com/@${encodeURIComponent(handle)}`,
      `https://www.youtube.com/c/${encodeURIComponent(handle)}`,
      `https://www.youtube.com/user/${encodeURIComponent(handle)}`,
    ];

    for (const url of urls) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Wasla/1.0)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const htmlText = await response.text();
      
      const ytInitialDataMatch = htmlText.match(/var ytInitialData = ({.*?});/s);
      if (ytInitialDataMatch) {
        try {
          const data = JSON.parse(ytInitialDataMatch[1]);
          const channelId = extractChannelIdFromYtInitialData(data);
          if (channelId) return channelId;
        } catch {
          // Ignore parse errors
        }
      }

      const metaMatch = htmlText.match(/<meta itemprop="channelId" content="(UC[\w-]{22,})"/);
      if (metaMatch) return metaMatch[1];

      const canonicalMatch = htmlText.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22,})"/);
      if (canonicalMatch) return canonicalMatch[1];

      const jsonLdMatch = htmlText.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
      if (jsonLdMatch) {
        for (const script of jsonLdMatch) {
          try {
            const data = JSON.parse(script.replace(/<script type="application\/ld\+json">|<\/script>/g, ''));
            const channelId = extractChannelIdFromJsonLd(data);
            if (channelId) return channelId;
          } catch {
            // Ignore parse errors
          }
        }
      }

      const patterns = [
        /"channelId":"(UC[\w-]{22,})"/,
        /"browseId":"(UC[\w-]{22,})"/,
        /"externalId":"(UC[\w-]{22,})"/,
        /channel_id=UC([\w-]{22,})/,
      ];

      for (const pattern of patterns) {
        const match = htmlText.match(pattern);
        if (match) return match[1] || match[0];
      }
    }

    return null;
  } catch {
    return null;
  }
}

function extractChannelIdFromYtInitialData(data: Record<string, unknown>): string | null {
  try {
    const contents = data?.contents as Record<string, unknown> | undefined;
    const twoColumnBrowse = contents?.twoColumnBrowseResultsRenderer as Record<string, unknown> | undefined;
    const tabs = twoColumnBrowse?.tabs as unknown[] | undefined;
    
    if (tabs) {
      for (const tab of tabs) {
        const tabRenderer = tab as Record<string, unknown>;
        const tabContent = tabRenderer.tabRenderer as Record<string, unknown> | undefined;
        const content = tabContent?.content as Record<string, unknown> | undefined;
        const sectionList = content?.sectionListRenderer as Record<string, unknown> | undefined;
        const sections = sectionList?.contents as unknown[] | undefined;
        
        if (sections) {
          for (const section of sections) {
            const itemSection = section as Record<string, unknown>;
            const itemSectionRenderer = itemSection.itemSectionRenderer as Record<string, unknown> | undefined;
            const items = itemSectionRenderer?.contents as unknown[] | undefined;
            
            if (items) {
              for (const item of items) {
                const channelRenderer = (item as Record<string, unknown>)?.channelRenderer as Record<string, unknown> | undefined;
                if (channelRenderer?.channelId) {
                  return channelRenderer.channelId as string;
                }
              }
            }
          }
        }
      }
    }

    const header = data?.header as Record<string, unknown> | undefined;
    const c4TabbedHeader = header?.c4TabbedHeaderRenderer as Record<string, unknown> | undefined;
    if (c4TabbedHeader?.channelId) {
      return c4TabbedHeader.channelId as string;
    }
  } catch {
    // Ignore
  }
  return null;
}

function extractChannelIdFromJsonLd(data: Record<string, unknown>): string | null {
  try {
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (item['@type'] === 'ItemList' || item['@type'] === 'BreadcrumbList') {
        const elements = item.itemListElement as unknown[] | undefined;
        if (elements) {
          for (const element of elements) {
            const elementData = element as Record<string, unknown>;
            const itemProp = elementData.item as Record<string, unknown> | undefined;
            if (itemProp?.['@id']) {
              const match = (itemProp['@id'] as string).match(/channel\/(UC[\w-]{22,})/);
              if (match) return match[1];
            }
          }
        }
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

const DETAILS_CACHE = new Map<string, { data: import('../types/index.js').ChannelDetails; timestamp: number }>();
const DETAILS_CACHE_DURATION = 5 * 60 * 1000;
const DETAILS_MAX_CACHE_SIZE = 100;

export async function fetchChannelDetails(channelId: string, handle?: string): Promise<import('../types/index.js').ChannelDetails> {
  const cached = DETAILS_CACHE.get(channelId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { ...cached.data, videos: cached.data.videos.map((v) => ({ ...v })) };
  }

  const [rssData, pageData] = await Promise.all([
    fetchAndParseRSS(channelId),
    scrapeChannelPage(channelId, handle),
  ]);

  const result: import('../types/index.js').ChannelDetails = {
    channelName: rssData.channelName,
    handle: pageData.handle || handle,
    avatar: pageData.avatar,
    banner: pageData.banner,
    videos: rssData.videos,
  };

  // Evict oldest entry if cache is full
  if (DETAILS_CACHE.size >= DETAILS_MAX_CACHE_SIZE) {
    const firstKey = DETAILS_CACHE.keys().next().value;
    if (firstKey) DETAILS_CACHE.delete(firstKey);
  }
  DETAILS_CACHE.set(channelId, { data: result, timestamp: Date.now() });
  return result;
}

async function scrapeChannelPage(channelId: string, handle?: string): Promise<{ handle?: string; avatar?: string; banner?: string }> {
  try {
    const url = handle
      ? `https://www.youtube.com/@${encodeURIComponent(handle)}`
      : `https://www.youtube.com/channel/${channelId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Wasla/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return {};

    const html = await response.text();

    let avatar: string | undefined;
    let banner: string | undefined;

    // Try og:image first (avatar)
    const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogImage) avatar = ogImage[1];

    // Try ytInitialData for avatar + banner
    const ytMatch = html.match(/var ytInitialData = ({.*?});/s);
    if (ytMatch) {
      try {
        const data = JSON.parse(ytMatch[1]);
        const header = data?.header?.c4TabbedHeaderRenderer as Record<string, unknown> | undefined;
        if (header) {
          if (!avatar) {
            const avatarObj = header.avatar as Record<string, unknown> | undefined;
            const thumbnails = avatarObj?.thumbnails as unknown[] | undefined;
            if (thumbnails?.length) {
              const thumbs = thumbnails as Array<{ url: string }>;
              avatar = thumbs[thumbs.length - 1]?.url || avatar;
            }
          }
          const bannerObj = header.banner as Record<string, unknown> | undefined;
          const bannerThumbs = bannerObj?.thumbnails as unknown[] | undefined;
          if (bannerThumbs?.length) {
            const thumbs = bannerThumbs as Array<{ url: string }>;
            banner = thumbs[thumbs.length - 1]?.url;
          }
        }
      } catch { /* ignore */ }
    }

    return { avatar, banner };
  } catch {
    return {};
  }
}

export async function getChannelPlaylists(channelId: string): Promise<PlaylistSummary[]> {
  const cached = playlistCache.get(channelId);
  if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_DURATION) {
    return cached.data.map((p) => ({ ...p }));
  }

  const pending = pendingPlaylistRequests.get(channelId);
  if (pending) {
    return pending;
  }

  const promise = fetchChannelPlaylistsRSS(channelId);
  pendingPlaylistRequests.set(channelId, promise);

  try {
    const data = await promise;
    if (playlistCache.size >= PLAYLIST_MAX_CACHE_SIZE) {
      const firstKey = playlistCache.keys().next().value;
      if (firstKey) playlistCache.delete(firstKey);
    }
    playlistCache.set(channelId, {
      id: channelId,
      data: data.map((p) => ({ ...p })),
      timestamp: Date.now(),
    });
    return data;
  } finally {
    pendingPlaylistRequests.delete(channelId);
  }
}

async function fetchChannelPlaylistsRSS(channelId: string): Promise<PlaylistSummary[]> {
  const playlistIds = new Set<string>();

  // Strategy 1: RSS feed — link tags + yt:playlistId entries
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const c1 = new AbortController();
    const t1 = setTimeout(() => c1.abort(), FETCH_TIMEOUT);
    const rssResp = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Wasla/1.0)', Accept: 'application/xml, text/xml, */*' },
      signal: c1.signal,
    });
    clearTimeout(t1);

    if (rssResp.ok) {
      const xml = await rssResp.text();

      // Structured link parsing (original approach)
      try {
        const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false, trim: true });
        const links = parsed?.feed?.link;
        if (links) {
          const linkList = Array.isArray(links) ? links : [links];
          for (const link of linkList) {
            const href = (link as { $?: { href?: string } })?.$?.href;
            if (href) {
              const m = href.match(/[?&]playlist_id=([^&]+)/);
              if (m) playlistIds.add(m[1]);
            }
          }
        }
        // yt:playlistId on individual entries
        const entries = parsed?.feed?.entry;
        if (entries) {
          const entryList = Array.isArray(entries) ? entries : [entries];
          for (const entry of entryList) {
            const pid = getString((entry as Record<string, unknown>)['yt:playlistId']);
            if (pid && pid.startsWith('PL')) playlistIds.add(pid);
          }
        }
      } catch { /* ignore */ }

      // Raw regex on XML text
      for (const m of xml.matchAll(/[?&]list=(PL[\w-]{10,})/g)) playlistIds.add(m[1]);
      for (const m of xml.matchAll(/<yt:playlistId>(PL[\w-]{10,})<\/yt:playlistId>/g)) playlistIds.add(m[1]);
    }
  } catch { /* ignore */ }

  // Strategy 2: channel playlists page — lightweight HTML scan, no ytInitialData
  try {
    const pageUrl = `https://www.youtube.com/channel/${channelId}/playlists`;
    const c2 = new AbortController();
    const t2 = setTimeout(() => c2.abort(), FETCH_TIMEOUT);
    const pageResp = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Wasla/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: c2.signal,
    });
    clearTimeout(t2);

    if (pageResp.ok) {
      const html = await pageResp.text();
      for (const m of html.matchAll(/[?&]list=(PL[\w-]{10,})/g)) playlistIds.add(m[1]);
      for (const m of html.matchAll(/"playlistId":"(PL[\w-]{10,})"/g)) playlistIds.add(m[1]);
    }
  } catch { /* ignore */ }

  if (playlistIds.size === 0) return [];

  // Fetch each playlist RSS to get title + thumbnail
  const settled = await Promise.allSettled(
    Array.from(playlistIds).map(async (pid) => {
      const pdata = await fetchPlaylistData(pid);
      const summary: PlaylistSummary = {
        id: pid,
        title: pdata.playlistName,
        thumbnail: pdata.videos[0]?.thumbnail || `https://img.youtube.com/vi/${pid}/maxresdefault.jpg`,
        url: `https://www.youtube.com/playlist?list=${pid}`,
        videoCount: pdata.videos.length,
      };
      return summary;
    })
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<PlaylistSummary> => r.status === 'fulfilled')
    .map((r) => r.value);
}

export function clearPlaylistCache(): void {
  playlistCache.clear();
  pendingPlaylistRequests.clear();
}

// Clear all caches on startup to prevent stale data from taking effect
clearAllCaches();

export function getPlaylistCacheStats(): { size: number; entries: Array<{ id: string; data: PlaylistSummary[] }> } {
  return {
    size: playlistCache.size,
    entries: Array.from(playlistCache.values()),
  };
}
