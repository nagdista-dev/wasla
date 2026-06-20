import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'analytics.json');

interface TrackEvent {
  type: 'pageview' | 'videoclick' | 'visitor';
  path?: string;
  videoId?: string;
  visitorId: string;
  timestamp: number;
}

interface AnalyticsStore {
  totalVisits: number;
  uniqueVisitors: string[];
  pageViews: Record<string, number>;
  videoClicks: Record<string, number>;
  dailyVisits: Record<string, number>;
}

let store: AnalyticsStore = {
  totalVisits: 0,
  uniqueVisitors: [],
  pageViews: {},
  videoClicks: {},
  dailyVisits: {},
};

function getDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
        totalVisits: parsed.totalVisits ?? 0,
        uniqueVisitors: Array.isArray(parsed.uniqueVisitors) ? parsed.uniqueVisitors : [],
        pageViews: parsed.pageViews ?? {},
        videoClicks: parsed.videoClicks ?? {},
        dailyVisits: parsed.dailyVisits ?? {},
      };
    }
  } catch {
    store = {
      totalVisits: 0,
      uniqueVisitors: [],
      pageViews: {},
      videoClicks: {},
      dailyVisits: {},
    };
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

load();

export function trackEvent(event: TrackEvent): void {
  store.totalVisits++;
  const day = getDateKey(event.timestamp);
  store.dailyVisits[day] = (store.dailyVisits[day] ?? 0) + 1;

  if (!store.uniqueVisitors.includes(event.visitorId)) {
    store.uniqueVisitors.push(event.visitorId);
  }

  if (event.type === 'pageview' && event.path) {
    store.pageViews[event.path] = (store.pageViews[event.path] ?? 0) + 1;
  }

  if (event.type === 'videoclick' && event.videoId) {
    store.videoClicks[event.videoId] = (store.videoClicks[event.videoId] ?? 0) + 1;
  }

  save();
}

export function getDashboard() {
  const sortedPageViews = Object.entries(store.pageViews)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([path, count]) => ({ path, count }));

  const sortedVideoClicks = Object.entries(store.videoClicks)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([videoId, count]) => ({ videoId, count }));

  const sortedDailyVisits = Object.entries(store.dailyVisits)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));

  return {
    totalVisits: store.totalVisits,
    uniqueVisitors: store.uniqueVisitors.length,
    pageViews: sortedPageViews,
    videoClicks: sortedVideoClicks,
    dailyVisits: sortedDailyVisits,
  };
}

export function clearAnalytics(): void {
  store = {
    totalVisits: 0,
    uniqueVisitors: [],
    pageViews: {},
    videoClicks: {},
    dailyVisits: {},
  };
  save();
}
