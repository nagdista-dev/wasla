import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'shares.json');

export interface SharePayload {
  shareId: string;
  categoryName: string;
  channels: { id: string; name: string; handle?: string }[];
  createdAt: number;
  version: number;
}

interface ShareStore {
  shares: Record<string, SharePayload>;
}

let store: ShareStore = { shares: {} };

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load(): void {
  try {
    ensureDir();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      store = {
        shares: parsed.shares ?? {},
      };
    }
  } catch {
    store = { shares: {} };
  }
}

function save(): void {
  try {
    ensureDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    /* silently fail */
  }
}

function generateShareId(): string {
  const bytes = crypto.randomBytes(4);
  const id = bytes.toString('base64url').slice(0, 6);
  if (store.shares[id]) return generateShareId();
  return id;
}

load();

export function createShare(categoryName: string, channels: { id: string; name: string; handle?: string }[]): SharePayload {
  const shareId = generateShareId();
  const payload: SharePayload = {
    shareId,
    categoryName,
    channels,
    createdAt: Date.now(),
    version: 1,
  };
  store.shares[shareId] = payload;
  save();
  return payload;
}

export function getShare(shareId: string): SharePayload | null {
  return store.shares[shareId] ?? null;
}
