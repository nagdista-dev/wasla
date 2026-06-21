import LZString from 'lz-string';
import type { Channel } from '../types';

// ─── Payload shape ────────────────────────────────────────────────────────────
// { c: "CategoryName", ch: ["handle1", "handle2", ...] }
// Keys are kept minimal intentionally per task requirements.

interface SharePayload {
  c: string;
  ch: string[];
}

// ─── Encode ───────────────────────────────────────────────────────────────────
export function encodeSharePayload(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  // compressToEncodedURIComponent produces a URL-safe, LZ-compressed string
  return LZString.compressToEncodedURIComponent(json);
}

// ─── Decode ───────────────────────────────────────────────────────────────────
export function decodeSharePayload(encoded: string): SharePayload {
  // Try LZ-string first (new format)
  const lzResult = LZString.decompressFromEncodedURIComponent(encoded);
  if (lzResult) {
    return JSON.parse(lzResult) as SharePayload;
  }
  // Fallback: old base64 format (keeps backward-compat with existing links)
  try {
    const decoded = atob(encoded);
    const json = decodeURIComponent(decoded);
    return JSON.parse(json) as SharePayload;
  } catch {
    throw new Error('Invalid or corrupted share link');
  }
}

// ─── Create URL ───────────────────────────────────────────────────────────────
// Builds the shortest possible share link using ONLY:
//   - category name  (c)
//   - channel handles (ch)  — NOT IDs, NOT full objects
export function createShareUrl(
  categoryName: string,
  channels: { handle?: string; name?: string }[]
): string {
  // Collect handles; fall back to name-derived slug if handle missing
  const handles = channels
    .map((ch) => {
      if (ch.handle) {
        return ch.handle.startsWith('@') ? ch.handle.slice(1) : ch.handle;
      }
      return null;
    })
    .filter((h): h is string => !!h && h.length > 0);

  const payload: SharePayload = { c: categoryName, ch: handles };
  const encoded = encodeSharePayload(payload);
  return `${window.location.origin}/import/category?data=${encoded}`;
}

// ─── Username helpers (unchanged) ─────────────────────────────────────────────
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
      .replace(/^[\.\s]+|[\.\s]+$/g, '')
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
