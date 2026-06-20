import type { Channel, CommunityPost } from '../types';
import { api } from '../api';
import { getItem, putItem, replaceStoreItems, getAllFromIndex, getAll } from './indexedDbService';

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_POSTS_PER_CHANNEL = 2;
const VIDEO_URL_PATTERN = /(?:youtube\.com\/(?:watch|shorts|live)|youtu\.be\/)/i;
const LOCALSTORAGE_CACHE_KEY = 'wasla_posts_cache_v1';

interface ChannelMetadata {
  channelId: string;
  lastFetchTime: number;
  lastPostId?: string;
  lastPostPublishedAt?: string;
}

interface CachedPost {
  id: string;
  channelId: string;
  channelName: string;
  channelCategories: string[];
  title?: string;
  content: string;
  link?: string;
  publishedAt: string;
  thumbnail?: string;
  images: string[];
  source: 'rsshub' | 'rsshub-fallback';
  fetchedAt: number;
}

interface FetchResult {
  posts: CommunityPost[];
  errors: string[];
  fromCache: boolean;
}

type OnChannelPosts = (channelId: string, posts: CommunityPost[], error?: string) => void;

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

function deduplicateContent(content: string): string {
  if (!content) return content;

  const sentences = content.split(/[.!?]\s+/).filter(s => s.trim().length > 0);
  const uniqueSentences: string[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    const normalized = sentence.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueSentences.push(sentence);
    }
  }

  return uniqueSentences.join('. ').trim();
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

function normalizePost(post: CommunityPost): CachedPost {
  return {
    id: post.id,
    channelId: post.channelId,
    channelName: post.channelName,
    channelCategories: post.channelCategories,
    title: post.title,
    content: post.content,
    link: post.link,
    publishedAt: post.publishedAt,
    thumbnail: post.thumbnail,
    images: post.images,
    source: post.source,
    fetchedAt: post.fetchedAt,
  };
}

function denormalizePost(post: CachedPost): CommunityPost & { _sortTime?: number } {
  return {
    id: post.id,
    channelId: post.channelId,
    channelName: post.channelName,
    channelCategories: post.channelCategories,
    title: post.title,
    content: post.content,
    link: post.link,
    publishedAt: post.publishedAt,
    thumbnail: post.thumbnail,
    images: post.images,
    source: post.source,
    fetchedAt: post.fetchedAt,
  };
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

      if (!content && images.length === 0) return null;
      if (isVideoEntry(link || '', content)) return null;

      const deduplicatedContent = deduplicateContent(content);

      return {
        id: hash(`${channel.id}:${guid}`),
        channelId: channel.id,
        channelName: channel.name,
        channelCategories: channel.categories || [],
        title: undefined,
        content: deduplicatedContent,
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
  const response = await api.get<{ success: boolean; xml?: string; source?: string; error?: string }>(`/community/${encodeURIComponent(channel.id)}`);
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
  return sortedPosts.slice(0, MAX_POSTS_PER_CHANNEL);
}

async function getChannelMetadata(channelId: string): Promise<ChannelMetadata | undefined> {
  return getItem<ChannelMetadata>('communityChannels', channelId);
}

async function setChannelMetadata(metadata: ChannelMetadata): Promise<void> {
  await putItem('communityChannels', metadata);
}

async function getChannelPosts(channelId: string): Promise<CachedPost[]> {
  return getAllFromIndex<CachedPost>('communityPosts', 'channelId', channelId);
}

async function setChannelPosts(posts: CachedPost[]): Promise<void> {
  await replaceStoreItems('communityPosts', posts);
}

async function addPosts(channelId: string, posts: CommunityPost[]): Promise<void> {
  const existingPosts = await getChannelPosts(channelId);
  const existingMap = new Map(existingPosts.map(p => [p.id, p]));
  const newPosts: CachedPost[] = [];

  for (const post of posts) {
    if (!existingMap.has(post.id)) {
      newPosts.push(normalizePost(post));
    }
  }

  if (newPosts.length > 0) {
    const updatedPosts = [...existingPosts, ...newPosts]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, MAX_POSTS_PER_CHANNEL);
    await setChannelPosts(updatedPosts);
  }
}

export function loadCachedCommunityPosts(): CommunityPost[] {
  try {
    const cached = localStorage.getItem(LOCALSTORAGE_CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    const posts = parsed
      .filter((post: CommunityPost) => now - post.fetchedAt < CACHE_TTL_MS * 2)
      .map((post: CommunityPost) => ({
        ...post,
        channelCategories: post.channelCategories || [],
      }));
    return posts.sort((a: CommunityPost, b: CommunityPost) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  } catch {
    return [];
  }
}

function saveCachedCommunityPosts(posts: CommunityPost[]): void {
  try {
    localStorage.setItem(LOCALSTORAGE_CACHE_KEY, JSON.stringify(posts));
  } catch {
    // localStorage might be full; silently ignore
  }
}

export function getPostById(id: string): CommunityPost | null {
  const cached = loadCachedCommunityPosts();
  const found = cached.find(post => post.id === id);
  if (found) return found;
  return null;
}

export async function getPostByIdAsync(id: string): Promise<CommunityPost | null> {
  const cached = loadCachedCommunityPosts();
  const found = cached.find(post => post.id === id);
  if (found) return found;
  try {
    const allPosts = await getAll<CachedPost>('communityPosts');
    const match = allPosts.find(p => p.id === id);
    if (match) return denormalizePost(match);
  } catch {
    /* ignore */
  }
  return null;
}

function sortPostsByDate(posts: CommunityPost[]): CommunityPost[] {
  return [...posts].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function fetchCommunityPostsProgressive(
  channels: Channel[],
  onChannelPosts: OnChannelPosts,
  options?: { force?: boolean }
): Promise<void> {
  const promises = channels.map(async (channel) => {
    try {
      const metadata = await getChannelMetadata(channel.id);
      const existingPosts = await getChannelPosts(channel.id);
      const now = Date.now();

      if (!options?.force && metadata && now - metadata.lastFetchTime < CACHE_TTL_MS && existingPosts.length > 0) {
        onChannelPosts(channel.id, existingPosts.map(denormalizePost));
        return;
      }

      const freshPosts = await fetchChannelPosts(channel);
      if (freshPosts.length > 0) {
        await addPosts(channel.id, freshPosts);
        const latestPost = freshPosts[0];
        await setChannelMetadata({
          channelId: channel.id,
          lastFetchTime: now,
          lastPostId: latestPost.id,
          lastPostPublishedAt: latestPost.publishedAt,
        });
        onChannelPosts(channel.id, freshPosts);
      } else {
        onChannelPosts(channel.id, []);
      }
    } catch (error) {
      const errorMsg = `${channel.name}: ${error instanceof Error ? error.message : 'Failed to fetch'}`;
      let cachedPosts: CommunityPost[] = [];
      try {
        cachedPosts = (await getChannelPosts(channel.id)).map(denormalizePost);
      } catch {
        // ignore cache read errors
      }
      onChannelPosts(channel.id, cachedPosts, errorMsg);
    }
  });

  await Promise.allSettled(promises);
}

export async function fetchCommunityPosts(channels: Channel[], options?: { force?: boolean }): Promise<FetchResult> {
  const errors: string[] = [];
  const allPosts: CommunityPost[] = [];

  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      try {
        const metadata = await getChannelMetadata(channel.id);
        const existingPosts = await getChannelPosts(channel.id);
        const now = Date.now();

        if (!options?.force && metadata && now - metadata.lastFetchTime < CACHE_TTL_MS && existingPosts.length > 0) {
          return { posts: existingPosts.map(denormalizePost), channelId: channel.id, error: null };
        }

        const freshPosts = await fetchChannelPosts(channel);
        if (freshPosts.length > 0) {
          await addPosts(channel.id, freshPosts);
          const latestPost = freshPosts[0];
          const meta = {
            channelId: channel.id,
            lastFetchTime: now,
            lastPostId: latestPost.id,
            lastPostPublishedAt: latestPost.publishedAt,
          };
          await setChannelMetadata(meta);
          return { posts: freshPosts, channelId: channel.id, error: null };
        }

        return { posts: [], channelId: channel.id, error: null };
      } catch (error) {
        const errorMsg = `${channel.name}: ${error instanceof Error ? error.message : 'Failed to fetch'}`;
        let cachedPosts: CommunityPost[] = [];
        try {
          cachedPosts = (await getChannelPosts(channel.id)).map(denormalizePost);
        } catch {
          // ignore cache read errors
        }
        return { posts: cachedPosts, channelId: channel.id, error: errorMsg };
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allPosts.push(...result.value.posts);
      if (result.value.error) {
        errors.push(result.value.error);
      }
    } else {
      errors.push(result.reason?.message || 'Unknown error');
    }
  }

  const sorted = sortPostsByDate(allPosts);

  if (sorted.length > 0) {
    saveCachedCommunityPosts(sorted);
  }

  const fromCache = results.every(r => r.status === 'fulfilled' && !r.value.error);

  return { posts: sorted, errors, fromCache };
}
