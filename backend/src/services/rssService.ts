import { Innertube, UniversalCache } from 'youtubei.js';
import { parseStringPromise } from 'xml2js';
import { ChannelFeedData, VideoData, PlaylistSummary } from '../types/index.js';
import { addRelativeTimeToVideos } from '../utils/dateUtils.js';

const CACHE_DURATION = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const FETCH_TIMEOUT = 10000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 1000;
const NEGATIVE_CACHE_TTL = 2 * 60 * 1000;

const cache = new Map<string, { id: string; data: ChannelFeedData; timestamp: number }>();
const pendingRequests = new Map<string, Promise<ChannelFeedData>>();
const negativeCache = new Map<string, number>();

const PLAYLIST_CACHE_DURATION = 5 * 60 * 1000;
const PLAYLIST_MAX_CACHE_SIZE = 100;
const playlistCache = new Map<string, { id: string; data: PlaylistSummary[]; timestamp: number }>();
const pendingPlaylistRequests = new Map<string, Promise<PlaylistSummary[]>>();

const DETAILS_CACHE = new Map<string, { data: import('../types/index.js').ChannelDetails; timestamp: number }>();
const DETAILS_CACHE_DURATION = 5 * 60 * 1000;
const DETAILS_MAX_CACHE_SIZE = 100;

const COMMUNITY_POSTS_RSSHUB_INSTANCES = ['https://rsshub.app', 'https://rsshub.rssforever.com'];

const communityPostsCache = new Map<string, { xml: string; source: string; timestamp: number }>();
const COMMUNITY_POSTS_CACHE_TTL = 5 * 60 * 1000;

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

/** Validate that a channel ID has the correct YouTube RSS format (starts with UC, 24+ chars) */
function validateChannelId(channelId: string): boolean {
  return /^UC[\w-]{22,}$/.test(channelId);
}

/** Check if a channel ID is in the negative cache (recently failed) */
function isNegativeCached(channelId: string): boolean {
  const entry = negativeCache.get(channelId);
  if (!entry) return false;
  if (Date.now() - entry > NEGATIVE_CACHE_TTL) {
    negativeCache.delete(channelId);
    return false;
  }
  return true;
}

/** Fetch a URL with retry and exponential backoff. Does NOT retry 404s for validated channel IDs. */
async function fetchWithRetry(url: string, retries = MAX_RETRIES, context?: string): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Wasla/1.0)',
          Accept: 'application/xml, text/xml, */*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) return response;

      if (response.status === 404) {
        throw new Error(`Failed to fetch RSS feed: 404 Not Found${context ? ` (${context})` : ''}`);
      }

      lastError = new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}${context ? ` (${context})` : ''}`);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.message.includes('404')) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < retries) {
      const delay = Math.min(RETRY_BASE_DELAY * Math.pow(2, attempt), 4000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`Failed to fetch RSS feed after ${retries + 1} attempts${context ? ` (${context})` : ''}`);
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
  if (!validateChannelId(channelId)) {
    throw new Error(`Invalid channel ID format: "${channelId}". Channel ID must start with "UC" and be at least 24 characters.`);
  }

  if (isNegativeCached(channelId)) {
    return {
      channelName: 'Unknown Channel',
      videos: [],
      latestVideo: {
        title: '',
        link: '',
        publishedDate: new Date().toISOString(),
        channelName: 'Unknown Channel',
      },
    };
  }

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

    if (data.videos.length === 0) {
      negativeCache.set(channelId, Date.now());
    } else {
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
    }

    return data;
  } finally {
    pendingRequests.delete(channelId);
  }
}

export async function fetchCommunityPostsXml(channelId: string): Promise<{ xml: string; source: string }> {
  if (!validateChannelId(channelId)) {
    throw new Error(`Invalid channel ID format: "${channelId}". Channel ID must start with "UC" and be at least 24 characters.`);
  }

  const cached = communityPostsCache.get(channelId);
  if (cached && Date.now() - cached.timestamp < COMMUNITY_POSTS_CACHE_TTL) {
    return { xml: cached.xml, source: cached.source };
  }

  let lastError: Error | undefined;

  for (const instance of COMMUNITY_POSTS_RSSHUB_INSTANCES) {
    const url = `${instance}/youtube/community/${encodeURIComponent(channelId)}`;
    try {
      const response = await fetchWithRetry(url, 1, `community posts ${channelId}`);
      const xml = await response.text();
      communityPostsCache.set(channelId, { xml, source: instance, timestamp: Date.now() });
      return { xml, source: instance };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error(`Failed to fetch community posts for ${channelId}`);
}

async function fetchAndParseRSS(channelId: string): Promise<ChannelFeedData> {
  if (!validateChannelId(channelId)) {
    throw new Error(`Invalid channel ID format: "${channelId}". Channel ID must start with "UC" and be at least 24 characters.`);
  }

  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const context = `channelId=${channelId}`;

  console.debug(`[rssService] Fetching RSS for channel ${channelId}: ${url}`);

  let response: Response;
  try {
    response = await fetchWithRetry(url, MAX_RETRIES, context);
  } catch (error) {
    console.error(`[rssService] RSS fetch failed for channel ${channelId}:`, error instanceof Error ? error.message : error);
    return {
      channelName: 'Unknown Channel',
      videos: [],
      latestVideo: {
        title: '',
        link: '',
        publishedDate: new Date().toISOString(),
        channelName: 'Unknown Channel',
      },
    };
  }

  const xmlText = await response.text();
  const parsed = await parseStringPromise(xmlText, {
    explicitArray: false,
    ignoreAttrs: false,
    trim: true,
  });

  const channelName = getString(parsed?.feed?.title) || 'Unknown Channel';
  const entries = parsed?.feed?.entry;
  const entryList = entries ? (Array.isArray(entries) ? entries : [entries]) : [];

  if (entryList.length === 0) {
    console.warn(`[rssService] No entries in RSS feed for channel ${channelId}`);
    return {
      channelName,
      videos: [],
      latestVideo: {
        title: '',
        link: '',
        publishedDate: new Date().toISOString(),
        channelName,
      },
    };
  }

  const videos = entryList
    .map((entry: Record<string, unknown>) => {
      const mediaGroup = (entry['media:group'] || {}) as Record<string, unknown>;
      const mediaCommunity = (mediaGroup['media:community'] || {}) as Record<string, unknown>;
      const title = getString(entry.title) || 'Untitled';
      const videoId = getVideoId(entry);
      const link = videoId ? watchUrl(videoId) : getLink(entry.link, `https://www.youtube.com/channel/${channelId}`);

      return {
        title,
        link,
        thumbnail: getThumbnail(mediaGroup['media:thumbnail']),
        publishedDate: getString(entry.published) || getString(entry.updated) || new Date().toISOString(),
        channelName,
        views: getViews(mediaCommunity['media:statistics']),
        duration: getDuration(mediaGroup['media:content']),
        description: getString(mediaGroup['media:description']) || undefined,
      };
    })
    .filter((v) => v.link.includes('watch?v='))
    .sort((a: VideoData, b: VideoData) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate));

  if (videos.length === 0) {
    console.warn(`[rssService] No playable videos found in feed for channel ${channelId}`);
    return {
      channelName,
      videos: [],
      latestVideo: {
        title: '',
        link: '',
        publishedDate: new Date().toISOString(),
        channelName,
      },
    };
  }

  const videosWithRelativeTime = addRelativeTimeToVideos(videos);

  return {
    channelName,
    videos: videosWithRelativeTime,
    latestVideo: videosWithRelativeTime[0],
  };
}

export async function fetchPlaylistData(playlistId: string): Promise<{ playlistName: string; channelName?: string; videos: VideoData[] }> {
  if (!/^(PL|UU|LL|FL|RD|UL|OL)[\w-]{10,}$/.test(playlistId)) {
    console.warn(`[rssService] Playlist ID "${playlistId}" does not match expected YouTube playlist format`);
  }

  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
  const context = `playlistId=${playlistId}`;

  const response = await fetchWithRetry(url, MAX_RETRIES, context);

  const xmlText = await response.text();
  const parsed = await parseStringPromise(xmlText, {
    explicitArray: false,
    ignoreAttrs: false,
    trim: true,
  });

  const playlistName = getString(parsed?.feed?.title) || 'Untitled Playlist';
  const channelName = getString(parsed?.feed?.author?.name) || getString(parsed?.feed?.author?.[0]?.name);
  const entries = parsed?.feed?.entry;
  const entryList = entries ? (Array.isArray(entries) ? entries : [entries]) : [];

  if (entryList.length === 0) {
    console.warn(`[rssService] No entries in RSS feed for playlist ${playlistId}`);
    return { playlistName, channelName, videos: [] };
  }

  const videos = entryList
    .map((entry: Record<string, unknown>) => {
      const mediaGroup = (entry['media:group'] || {}) as Record<string, unknown>;
      const mediaCommunity = (mediaGroup['media:community'] || {}) as Record<string, unknown>;
      const title = getString(entry.title) || 'Untitled';
      const videoId = getVideoId(entry);
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
    .filter((v) => v.link.includes('watch?v='));

  const videosWithRelativeTime = addRelativeTimeToVideos(videos);

  return {
    playlistName,
    channelName,
    videos: videosWithRelativeTime,
  };
}

export async function fetchVideoDataById(videoId: string): Promise<VideoData | null> {
  try {
    const watchUrlStr = `https://www.youtube.com/watch?v=${videoId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(watchUrlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Wasla/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const htmlText = await response.text();

    const jsonLdMatches = htmlText.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (jsonLdMatches) {
      for (const script of jsonLdMatches) {
        try {
          const json = JSON.parse(script.replace(/<script type="application\/ld\+json">|<\/script>/g, ''));
          if (json['@type'] === 'VideoObject' || json['@type'] === 'VideoObject') {
            const channelName = json.author?.name || '';
            const channelUrl = json.author?.url || '';
            const channelIdMatch = channelUrl.match(/channel\/(UC[\w-]{22,})/);
            return {
              title: json.name || 'Untitled',
              link: watchUrlStr,
              thumbnail: json.thumbnailUrl?.[0] || (typeof json.thumbnailUrl === 'string' ? json.thumbnailUrl : undefined) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              publishedDate: json.uploadDate || new Date().toISOString(),
              channelName,
              description: json.description || undefined,
              duration: json.duration ? String(isoDurationToSeconds(json.duration)) : undefined,
              views: json.interactionStatistic?.find((s: Record<string, unknown>) => s['@type'] === 'InteractionCounter')?.userInteractionCount
                ? parseInt(json.interactionStatistic.find((s: Record<string, unknown>) => s['@type'] === 'InteractionCounter')?.userInteractionCount, 10)
                : undefined,
            };
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    const descriptionMatch = htmlText.match(/<meta name="description" content="([^"]+)"/);
    const titleMatch = htmlText.match(/<meta name="title" content="([^"]+)"/) || htmlText.match(/<title>([^<]+)<\/title>/);

    return {
      title: titleMatch?.[1]?.replace(' - YouTube', '') || 'Untitled',
      link: watchUrlStr,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      publishedDate: new Date().toISOString(),
      channelName: '',
      description: descriptionMatch?.[1] ? descriptionMatch[1].replace(/&amp;/g, '&') : undefined,
    };
  } catch {
    return null;
  }
}

function isoDurationToSeconds(iso: string): number {
  const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1]?.replace('H', '') || '0', 10);
  const minutes = parseInt(match[2]?.replace('M', '') || '0', 10);
  const seconds = parseInt(match[3]?.replace('S', '') || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

interface TrackInfo {
  code: string;
  name: string;
  isAutoGenerated: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subtitle / Caption fetching
// Primary: youtubei.js (generate_session_locally=true for Vercel speed,
//          UniversalCache(false) to avoid filesystem writes on serverless).
// Fallback: embed-page → InnerTube API → watch-page HTML scrape.
// ─────────────────────────────────────────────────────────────────────────────

/** Cached Innertube instance — reused across calls within the same execution context */
let _innertubeCache: Awaited<ReturnType<typeof Innertube.create>> | null = null;

async function getInnertube() {
  if (!_innertubeCache) {
    _innertubeCache = await Innertube.create({
      generate_session_locally: true,  // No network round-trip on init
      cache: new UniversalCache(false), // Memory-only — no filesystem writes (Vercel-safe)
      lang: 'en',
      location: 'US',
    });
  }
  return _innertubeCache;
}

/**
 * Strategy 0 (primary): youtubei.js — the only approach that reliably bypasses
 * YouTube's server-side IP restrictions. Works locally AND on Vercel.
 */
async function fetchFromYoutubei(videoId: string): Promise<{
  captionTracks: any[];
  playerResponse: any;
  youtubeiInfo: any;
} | null> {
  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);
    const tracks = info.captions?.caption_tracks ?? [];
    if (tracks.length === 0) return null;
    // Normalise to the same shape as playerCaptionsTracklistRenderer
    const captionTracks = tracks.map((t: any) => ({
      languageCode: t.language_code,
      baseUrl: t.base_url,
      name: { simpleText: t.name?.text ?? t.language_code.toUpperCase() },
      kind: t.kind,
      isAutoGenerated: t.kind === 'asr',
    }));
    console.log(`[subtitles] youtubei.js: ${captionTracks.length} tracks`);
    return { captionTracks, playerResponse: {}, youtubeiInfo: info };
  } catch (err) {
    console.warn('[subtitles] youtubei.js failed:', err instanceof Error ? err.message : err);
    _innertubeCache = null; // Reset on failure so next call retries
    return null;
  }
}

const SUBTITLE_TIMEOUT_MS = 9000;

// YouTube InnerTube client-name IDs
const YT_CLIENTS = [
  // ANDROID — most reliable for caption data
  {
    id: 3,
    name: 'ANDROID',
    version: '17.31.35',
    key: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
    ua: 'com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip',
    extra: { androidSdkVersion: 30, utcOffsetMinutes: 0 },
  },
  // TVHTML5_SIMPLY_EMBEDDED_PLAYER — low restriction
  {
    id: 85,
    name: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
    version: '2.0',
    key: 'AIzaSyDCU8hByM-4DrUqRex-AjkryPEBM7YAFM',
    ua: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1',
    extra: {},
    thirdParty: { embedUrl: 'https://www.youtube.com/' },
  },
  // IOS
  {
    id: 5,
    name: 'IOS',
    version: '17.33.2',
    key: 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc',
    ua: 'com.google.ios.youtube/17.33.2 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
    extra: { deviceModel: 'iPhone14,3', utcOffsetMinutes: 0 },
  },
] as const;

/**
 * Extract a top-level JSON object assigned to `marker` from HTML/JS source.
 * Uses bracket-counting to correctly handle nested objects — regex alone fails
 * because YouTube's player response JSON contains thousands of nested `}` chars.
 */
function extractJsonObject(html: string, marker: string): any | null {
  const needle = marker + ' = ';
  const markerIdx = html.indexOf(needle);
  if (markerIdx === -1) return null;

  const braceStart = html.indexOf('{', markerIdx + needle.length);
  if (braceStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(html.slice(braceStart, i + 1)); } catch { return null; }
        }
      }
    }
  }
  return null;
}

/**
 * Strategy 1: scrape the YouTube EMBED page.
 * The embed endpoint is designed for cross-origin use and is far less
 * aggressively bot-filtered than the main watch page.
 * Works reliably from Vercel / AWS / etc.
 */
async function fetchFromEmbedPage(videoId: string): Promise<{
  captionTracks: any[];
  playerResponse: any;
} | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBTITLE_TIMEOUT_MS);
    const resp = await fetch(
      `https://www.youtube.com/embed/${videoId}?hl=en&cc_load_policy=1`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    if (!resp.ok) return null;

    const html = await resp.text();
    const data = extractJsonObject(html, 'ytInitialPlayerResponse');
    if (data) {
      const captionTracks =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        console.log(`[subtitles] embed page: ${captionTracks.length} tracks`);
        return { captionTracks, playerResponse: data };
      }
    }
    return null;
  } catch (err) {
    console.warn('[subtitles] embed page failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Strategy 2: InnerTube /player API with correct client-name IDs.
 */
async function fetchFromInnerTube(videoId: string): Promise<{
  captionTracks: any[];
  playerResponse: any;
} | null> {
  for (const ctx of YT_CLIENTS) {
    try {
      const clientObj: Record<string, any> = {
        clientName: ctx.name,
        clientVersion: ctx.version,
        hl: 'en',
        gl: 'US',
        ...ctx.extra,
      };
      const body: Record<string, any> = {
        context: { client: clientObj },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      };
      if ('thirdParty' in ctx && ctx.thirdParty) {
        body.context.thirdParty = ctx.thirdParty;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SUBTITLE_TIMEOUT_MS);
      const resp = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${ctx.key}&prettyPrint=false`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent': ctx.ua,
            'X-Youtube-Client-Name': String(ctx.id),
            'X-Youtube-Client-Version': ctx.version,
            'Origin': 'https://www.youtube.com',
            'Referer': 'https://www.youtube.com/',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
      clearTimeout(timer);

      if (!resp.ok) {
        console.warn(`[subtitles] InnerTube ${ctx.name} HTTP ${resp.status}`);
        continue;
      }
      const data = await resp.json();
      const captionTracks =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        console.log(`[subtitles] InnerTube ${ctx.name}: ${captionTracks.length} tracks`);
        return { captionTracks, playerResponse: data };
      }
    } catch (err) {
      console.warn(`[subtitles] InnerTube ${ctx.name} error:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

/**
 * Strategy 3: scrape the main watch page (may be blocked by CAPTCHA on Vercel).
 */
async function fetchFromWatchPage(videoId: string): Promise<{
  captionTracks: any[];
  playerResponse: any;
} | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBTITLE_TIMEOUT_MS);
    const resp = await fetch(
      `https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1&hl=en`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    if (!resp.ok) return null;
    const html = await resp.text();
    if (html.includes('class="g-recaptcha"')) return null;

    const data = extractJsonObject(html, 'ytInitialPlayerResponse');
    if (data) {
      const captionTracks =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        console.log(`[subtitles] watch page: ${captionTracks.length} tracks`);
        return { captionTracks, playerResponse: data };
      }
    }
    return null;
  } catch (err) {
    console.warn('[subtitles] watch page failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Download and parse YouTube caption data from a baseUrl.
 * Forces fmt=json3 (most reliable format), falls back to srv3 XML parsing.
 */
async function fetchTranscriptXml(
  baseUrl: string,
): Promise<{ offset: number; duration: number; text: string }[]> {
  // Force JSON3 format — more reliable than XML across all YouTube caption types
  const json3Url = baseUrl
    .replace(/[?&]fmt=[^&]*/g, '')
    .replace(/[?&]xorb=[^&]*/g, '')
    + (baseUrl.includes('?') ? '&' : '?') + 'fmt=json3';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUBTITLE_TIMEOUT_MS);

  const resp = await fetch(json3Url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept: 'application/json, text/xml, */*',
    },
    signal: controller.signal,
  });
  clearTimeout(timer);
  if (!resp.ok) throw new Error(`Transcript fetch ${resp.status}`);

  const body = await resp.text();
  const results: { offset: number; duration: number; text: string }[] = [];

  // ── Format A: JSON3  {"events":[{"tStartMs":0,"dDurationMs":1000,"segs":[{"utf8":"Hello"}]}]} ──
  try {
    const json = JSON.parse(body);
    const events: any[] = json?.events ?? [];
    for (const ev of events) {
      if (!ev.segs || ev.tStartMs == null) continue;
      const text = ev.segs
        .map((s: any) => s.utf8 ?? '')
        .join('')
        .replace(/\n/g, ' ')
        .trim();
      if (!text || text === '\n') continue;
      results.push({
        offset: ev.tStartMs,          // ms
        duration: ev.dDurationMs ?? 2000, // ms
        text,
      });
    }
    if (results.length > 0) return results;
  } catch { /* not JSON — try XML formats below */ }

  // ── Format B: srv3 XML  <p t="ms" d="ms"><s>word</s></p> ──
  const pRx = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = pRx.exec(body)) !== null) {
    const inner = m[3];
    let text = '';
    const sRx = /<s[^>]*>([^<]*)<\/s>/g;
    let sm: RegExpExecArray | null;
    while ((sm = sRx.exec(inner)) !== null) text += sm[1];
    if (!text) text = inner.replace(/<[^>]+>/g, '');
    text = xtdecode(text).trim();
    if (text) results.push({ offset: parseInt(m[1], 10), duration: parseInt(m[2], 10), text });
  }
  if (results.length > 0) return results;

  // ── Format C: ttml XML  <text start="s" dur="s">...</text> ──
  const tRx = /<text start="([^"]*)" dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
  while ((m = tRx.exec(body)) !== null) {
    const text = xtdecode(m[3]).trim();
    if (text) results.push({ offset: parseFloat(m[1]), duration: parseFloat(m[2]), text });
  }
  return results;
}

function xtdecode(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function getLanguageName(code: string): string {
  const map: Record<string, string> = {
    en:'English',es:'Spanish',fr:'French',de:'German',it:'Italian',
    pt:'Portuguese',ru:'Russian',ja:'Japanese',ko:'Korean',zh:'Chinese',
    hi:'Hindi',ar:'Arabic',th:'Thai',vi:'Vietnamese',tr:'Turkish',
    pl:'Polish',nl:'Dutch',sv:'Swedish',da:'Danish',no:'Norwegian',
    fi:'Finnish',cs:'Czech',hu:'Hungarian',ro:'Romanian',bg:'Bulgarian',
    hr:'Croatian',sk:'Slovak',sl:'Slovenian',et:'Estonian',lv:'Latvian',
    lt:'Lithuanian',uk:'Ukrainian',he:'Hebrew',el:'Greek',id:'Indonesian',
    ms:'Malay',tl:'Filipino',
  };
  return map[code] || code.toUpperCase();
}

/**
 * Main subtitle entry-point. Serverless-safe.
 * Order: embed page → InnerTube API → watch page scrape
 */
export async function fetchSubtitles(
  videoId: string,
  targetLang?: string,
): Promise<{
  languages: TrackInfo[];
  subtitles: { start: number; duration: number; text: string }[];
  selectedLanguage: string;
} | null> {
  // Run embed page (fastest, most reliable on Vercel) in parallel with InnerTube
  const [embedResult, innerTubeResult] = await Promise.all([
    fetchFromEmbedPage(videoId),
    fetchFromInnerTube(videoId),
  ]);

  let tracksResult = embedResult ?? innerTubeResult;

  if (!tracksResult) {
    console.warn(`[subtitles] primary strategies failed for ${videoId}, trying watch page`);
    tracksResult = await fetchFromWatchPage(videoId);
  }

  if (!tracksResult) {
    console.warn(`[subtitles] all strategies failed for ${videoId}`);
    return { languages: [], subtitles: [], selectedLanguage: '' };
  }

  const { captionTracks } = tracksResult;

  const languages: TrackInfo[] = captionTracks.map((t: any) => ({
    code: t.languageCode ?? t.language_code ?? '',
    name:
      t.name?.simpleText ||
      t.name?.runs?.[0]?.text ||
      getLanguageName(t.languageCode ?? t.language_code ?? ''),
    isAutoGenerated: t.kind === 'asr' || !!t.isAutoGenerated,
  }));

  const langCodes = languages.map(l => l.code);
  let finalLang: string;
  if (targetLang && langCodes.includes(targetLang)) {
    finalLang = targetLang;
  } else if (langCodes.includes('en')) {
    finalLang = 'en';
  } else if (langCodes.length > 0) {
    finalLang = langCodes[0];
  } else {
    return { languages, subtitles: [], selectedLanguage: '' };
  }

  const track =
    captionTracks.find((t: any) => (t.languageCode ?? t.language_code) === finalLang) ??
    captionTracks[0];

  const baseUrl: string | undefined = track?.baseUrl ?? track?.base_url;
  if (!baseUrl) {
    console.warn(`[subtitles] No baseUrl for ${finalLang} in ${videoId}`);
    return { languages, subtitles: [], selectedLanguage: finalLang };
  }

  try {
    const raw = await fetchTranscriptXml(baseUrl);
    if (raw.length === 0) {
      return { languages, subtitles: [], selectedLanguage: finalLang };
    }

    const subtitles = raw.map(item => ({
      start:  item.offset > 1000 ? item.offset  / 1000 : item.offset,
      duration: item.duration > 1000 ? item.duration / 1000 : item.duration,
      text: item.text,
    }));

    console.log(`[subtitles] ✓ ${subtitles.length} cues for ${videoId} (${finalLang})`);
    return { languages, subtitles, selectedLanguage: finalLang };
  } catch (err) {
    console.error('[subtitles] XML fetch error:', err instanceof Error ? err.message : err);
    return { languages, subtitles: [], selectedLanguage: finalLang };
  }
}

export function clearAllCaches(): void {
  cache.clear();
  pendingRequests.clear();
  negativeCache.clear();
  DETAILS_CACHE.clear();
  playlistCache.clear();
  pendingPlaylistRequests.clear();
  communityPostsCache.clear();
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

export async function fetchChannelDetails(channelId: string, handle?: string): Promise<import('../types/index.js').ChannelDetails> {
  const cached = DETAILS_CACHE.get(channelId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { ...cached.data, videos: cached.data.videos.map((v) => ({ ...v })) };
  }

  const [rssResult, pageData] = await Promise.allSettled([
    fetchAndParseRSS(channelId),
    scrapeChannelPage(channelId, handle),
  ]);

  const rssData = rssResult.status === 'fulfilled' ? rssResult.value : null;
  const pageInfo = pageData.status === 'fulfilled' ? pageData.value : {};

  if (!rssData) {
    console.warn(`[rssService] RSS fetch failed for channel ${channelId}, using page data only`);
  }

  const result: import('../types/index.js').ChannelDetails = {
    channelName: rssData?.channelName || pageInfo.handle || handle || channelId,
    handle: pageInfo.handle || handle,
    avatar: pageInfo.avatar,
    banner: pageInfo.banner,
    videos: rssData?.videos || [],
  };

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
