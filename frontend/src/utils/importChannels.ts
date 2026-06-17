import type { Channel } from '../types';

export interface ImportResult {
  channels: Channel[];
  errors: string[];
}

interface RawChannel {
  id: string;
  name: string;
  handle?: string;
  categories?: unknown;
  favorite?: unknown;
}

function isValidChannel(raw: unknown): raw is RawChannel {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || obj.id.length === 0) return false;
  if (typeof obj.name !== 'string' || obj.name.length === 0) return false;
  return true;
}

export function parseAndValidateChannelsJson(jsonString: string): ImportResult {
  const errors: string[] = [];
  const channels: Channel[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { channels: [], errors: ['Invalid JSON file. Please upload a valid JSON file.'] };
  }

  if (!Array.isArray(parsed)) {
    return { channels: [], errors: ['JSON root must be an array of channels.'] };
  }

  if (parsed.length > 1000) {
    return { channels: [], errors: ['File contains too many items (max 1000). Please split into smaller files.'] };
  }

  const seen = new Set<string>();

  for (let i = 0; i < parsed.length; i++) {
    const raw = parsed[i];

    if (!isValidChannel(raw)) {
      errors.push(`Item at index ${i + 1} is invalid: missing or empty "id" or "name".`);
      continue;
    }

    if (seen.has(raw.id)) {
      errors.push(`Duplicate channel ID at index ${i + 1}: "${raw.id}".`);
      continue;
    }

    seen.add(raw.id);

    const categories: string[] = Array.isArray(raw.categories)
      ? raw.categories.filter((c): c is string => typeof c === 'string' && c.length > 0)
      : [];

    channels.push({
      id: raw.id,
      name: raw.name.trim(),
      handle: typeof raw.handle === 'string' && raw.handle.length > 0 ? raw.handle.trim() : undefined,
      categories,
      favorite: typeof raw.favorite === 'boolean' ? raw.favorite : undefined,
    });
  }

  return { channels, errors };
}
