import type { Channel, CommunityPost } from '../types';
import { api } from '../api';

const CACHE_KEY = 'wasla_community_posts_cache';
const CACHE_TTL_MS = 15 * 60 * 1000;
const VIDEO_URL_PATTERN = /(?:youtube\.com\/(?:watch|shorts|live)|youtu\.be\/)/i;

interface CommunityFeedResponse {
  success: boolean;
  xml?: string;
  source?: string;
  error?: string;
}

interface CachedPosts {
  fetchedAt: number;
  posts: CommunityPost[];
}

interface FetchResult {
  posts: CommunityPost[];
  errors: string[];
  fromCache: boolean;
}

function readCache(): CachedPosts {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { fetchedAt: 0, posts: [] };
    const parsed = JSON.parse(raw) as CachedPosts;
    if (!Array.isArray(parsed.posts)) return { fetchedAt: 0, posts: [] };
    return parsed;
  } catch {
    return { fetchedAt: 0, posts: [] };
  }
}

function writeCache(posts: CommunityPost[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), posts }));
  } catch {
    // Cache writes can fail in private browsing or low-storage devices.
  }
}

function textFromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, video').forEach((node) => node.remove());
  return (doc.body.textContent || '').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
}

function imagesFromHtml(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const seen = new Set<string>();
  return Array.from(doc.querySelectorAll('img'))
    .map((img) => img.getAttribute('src') || img.getAttribute('data-src') || '')
    .filter((src) => {
      if (!src || seen.has(src)) return false;
      seen.add(src);
      return true;
    });
}

function getElementText(parent: Element, selector: string): string {
  return parent.querySelector(selector)?.textContent?.trim() || '';
}

function getNamespacedText(parent: Element, tagName: string): string {
  const node = Array.from(parent.children).find((child) => child.tagName.toLowerCase() === tagName.toLowerCase());
  return node?.textContent?.trim() || '';
}

function getThumbnail(item: Element, images: string[]): string | undefined {
  const mediaThumbnail = item.querySelector('thumbnail')?.getAttribute('url');
  const mediaContent = item.querySelector('content[url]')?.getAttribute('url');
  const enclosure = item.querySelector('enclosure[type^="image"]')?.getAttribute('url');
  return mediaThumbnail || mediaContent || enclosure || images[0];
}

function hash(value: string): string {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result.toString(36);
}

function isVideoEntry(link: string, content: string): boolean {
  return VIDEO_URL_PATTERN.test(link) || VIDEO_URL_PATTERN.test(content);
}

function parseFeed(xml: string, channel: Channel, source: CommunityPost['source']): CommunityPost[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid RSS response');
  }

  const entries = Array.from(doc.querySelectorAll('item, entry'));
  return entries
    .map((item): CommunityPost | null => {
      const rawContent =
        getElementText(item, 'encoded') ||
        getNamespacedText(item, 'content:encoded') ||
        getElementText(item, 'content') ||
        getElementText(item, 'summary') ||
        getElementText(item, 'description');
      const content = textFromHtml(rawContent);
      const title = getElementText(item, 'title');
      const link =
        item.querySelector('link[href]')?.getAttribute('href') ||
        getElementText(item, 'link');
      const published =
        getElementText(item, 'pubDate') ||
        getElementText(item, 'published') ||
        getElementText(item, 'updated') ||
        new Date().toISOString();
      const publishedDate = new Date(published);
      const guid = getElementText(item, 'guid') || getElementText(item, 'id') || link || `${channel.id}:${title}:${published}`;
      const images = imagesFromHtml(rawContent);

      if (!content && !title && images.length === 0) return null;
      if (isVideoEntry(link || '', `${title} ${content}`)) return null;

      return {
        id: hash(`${channel.id}:${guid}`),
        channelId: channel.id,
        channelName: channel.name,
        title: title && title !== content ? title : undefined,
        content: content || title,
        link: link || undefined,
        publishedAt: Number.isNaN(publishedDate.getTime()) ? new Date().toISOString() : publishedDate.toISOString(),
        thumbnail: getThumbnail(item, images),
        images,
        source,
        fetchedAt: Date.now(),
      };
    })
    .filter((post): post is CommunityPost => Boolean(post));
}

async function fetchChannelPosts(channel: Channel): Promise<CommunityPost[]> {
  const response = await api.get<CommunityFeedResponse>(`/community/${encodeURIComponent(channel.id)}`);
  if (!response.data.success || !response.data.xml) {
    throw new Error(response.data.error || 'Failed to fetch channel posts');
  }

  const allPosts = parseFeed(
    response.data.xml,
    channel,
    response.data.source === 'https://rsshub.app' ? 'rsshub' : 'rsshub-fallback',
  );
  
  if (allPosts.length === 0) return [];
  
  const sortedPosts = allPosts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return [sortedPosts[0]];
}

function mergePosts(posts: CommunityPost[]): CommunityPost[] {
  const byChannel = new Map<string, CommunityPost>();

  for (const post of posts) {
    if (!byChannel.has(post.channelId) || new Date(post.publishedAt) > new Date(byChannel.get(post.channelId)!.publishedAt)) {
      byChannel.set(post.channelId, post);
    }
  }

  return Array.from(byChannel.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function loadCachedCommunityPosts(): CommunityPost[] {
  return mergePosts(readCache().posts);
}

export function getCachedCommunityPost(postId: string): CommunityPost | undefined {
  return loadCachedCommunityPosts().find((post) => post.id === postId);
}

export async function fetchCommunityPosts(channels: Channel[], options?: { force?: boolean }): Promise<FetchResult> {
  const cache = readCache();
  const channelIds = new Set(channels.map((channel) => channel.id));
  const cachedPosts = cache.posts.filter((post) => channelIds.has(post.channelId));

  if (!options?.force && Date.now() - cache.fetchedAt < CACHE_TTL_MS && cachedPosts.length > 0) {
    return { posts: mergePosts(cachedPosts), errors: [], fromCache: true };
  }

  if (channels.length === 0) {
    writeCache([]);
    return { posts: [], errors: [], fromCache: false };
  }

  const settled = await Promise.allSettled(channels.map((channel) => fetchChannelPosts(channel)));
  const freshPosts: CommunityPost[] = [];
  const errors: string[] = [];

  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      freshPosts.push(...result.value);
    } else {
      errors.push(`${channels[index].name}: ${result.reason instanceof Error ? result.reason.message : 'Failed to fetch'}`);
    }
  });

  const merged = mergePosts([...freshPosts, ...cachedPosts]);
  writeCache(merged);
  return { posts: merged, errors, fromCache: false };
}
