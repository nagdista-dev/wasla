import type { Channel } from '../types';

export function encodeSharePayload(payload: any): string {
  const json = JSON.stringify(payload);
  const encoded = encodeURIComponent(json);
  return btoa(encoded);
}

export function decodeSharePayload(base64: string): any {
  const decoded = atob(base64);
  const json = decodeURIComponent(decoded);
  return JSON.parse(json);
}

export function createShareUrl(
  categoryName: string,
  channels: { id: string; name: string; handle?: string }[]
): string {
  const payload = { c: categoryName, ch: channels };
  const encoded = encodeSharePayload(payload);
  return `${window.location.origin}/import/category?data=${encoded}`;
}

export function generateUsername(
  name: string,
  existingUsernames: Set<string>,
  handle?: string
): string {
  let base = '';

  if (handle) {
    base = handle.startsWith('@') ? handle.slice(1) : handle;
    base = base
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF._-]/g, '')
      .replace(/^[._-]+|[._-]+$/g, '');
  }

  if (!base) {
    base = name
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s.-]/g, '')
      .trim()
      .replace(/\s+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .slice(0, 30);
  }

  if (!base || base.length < 2) base = 'channel';

  let username = base;
  let counter = 1;
  while (existingUsernames.has(username)) {
    username = `${base}.${counter}`;
    counter++;
  }

  return username;
}

export function ensureChannelUsernames(channels: Channel[]): Channel[] {
  const existingUsernames = new Set(
    channels
      .map((c) => c.username)
      .filter((u): u is string => !!u)
  );

  return channels.map((channel) => {
    if (channel.username && existingUsernames.has(channel.username)) {
      return channel;
    }
    const username = generateUsername(channel.name, existingUsernames, channel.handle);
    existingUsernames.add(username);
    return { ...channel, username };
  });
}

export function getChannelShareUrl(username: string): string {
  return `${window.location.origin}/c/@${username}`;
}
